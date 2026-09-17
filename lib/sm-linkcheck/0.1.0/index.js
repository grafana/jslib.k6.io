import http from 'k6/http'
import { check, fail } from 'k6'
import { Counter } from 'k6/metrics'
import { parseHTML } from 'k6/html'
import { URL } from '../../url/1.0.0/index.js'

const IGNORED_SCHEMES = ['#', 'mailto:', 'tel:', 'javascript:', 'data:']

const brokenLinks = new Counter('sm_linkcheck_broken_links')

// Scans a page's HTML for <a href> links and resolves them to absolute,
// deduplicated URLs relative to `pageURL`.
export function extractLinks(html, pageURL) {
  const seen = new Set()
  const links = []

  parseHTML(html)
    .find('a[href]')
    .each((_, el) => {
      const href = (el.getAttribute('href') || '').trim()
      if (!href || IGNORED_SCHEMES.some((scheme) => href.toLowerCase().startsWith(scheme))) {
        return
      }

      let absolute
      try {
        absolute = new URL(href, pageURL).toString()
      } catch (_e) {
        return
      }

      if (!seen.has(absolute)) {
        seen.add(absolute)
        links.push(absolute)
      }
    })

  return links
}

// Extracts the links on `page` (an already-navigated k6/browser Page), checks
// each one with a plain HTTP request, and reports any that don't come back
// with a status in `validStatuses`.
//
// Links are checked concurrently via http.batch() rather than one by one:
// Synthetic Monitoring checks have a hard wall-clock timeout (1-180s, no
// thresholds), so a serial loop over `maxLinks` requests could blow that
// budget on its own.
export async function checkLinks(page, options = {}) {
  const {
    maxLinks = 10,
    timeout = '10s',
    validStatuses = [200],
    params = {},
    failOnBroken = true,
  } = options

  const url = page.url()
  const html = await page.content()
  const links = extractLinks(html, url).slice(0, maxLinks)

  const responses = http.batch(
    links.map((link) => ({ method: 'GET', url: link, params: { timeout, ...params } }))
  )

  const results = links.map((link, i) => {
    const res = responses[i]
    const ok = validStatuses.includes(res.status)

    if (!ok) {
      brokenLinks.add(1, { url: link, status: String(res.status) })
    }

    return { url: link, status: res.status, ok, ...(res.error && { error: res.error }) }
  })

  const broken = results.filter((r) => !r.ok)

  const allOk = check(null, {
    'sm-linkcheck: no broken links found': () => broken.length === 0,
  })

  // check() alone doesn't fail a Synthetics check (no threshold support);
  // fail() is what actually flips it -- the documented check(...) || fail(...) pattern.
  if (!allOk && failOnBroken) {
    fail(
      `sm-linkcheck: found ${broken.length} broken link(s) on ${url}: ${broken
        .map((b) => `${b.url} (${b.error ?? b.status})`)
        .join(', ')}`
    )
  }

  return { url, checked: results.length, broken, results }
}

export default { extractLinks, checkLinks }
