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
      if (!href || IGNORED_SCHEMES.some((scheme) => href.startsWith(scheme))) {
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

// Extracts the links on `page` (an already-navigated k6/browser Page) and
// checks each one, reporting any that don't come back with a status in
// `validStatuses`.
//
// The page itself is rendered by the browser, so JavaScript-generated links
// on single-page apps are picked up too -- not just what's in the initial
// server response. Each individual link, though, is checked with a plain
// HTTP request rather than a full page load, the same way other synthetic
// monitoring providers' broken-link checkers do it, to keep the check fast
// and avoid spinning up a browser context per link.
//
// Links are checked concurrently with http.batch() rather than one by one:
// Grafana Cloud Synthetic Monitoring checks have a hard wall-clock timeout
// (1-180s, single iteration, no thresholds support), so a serial loop over
// `maxLinks` requests could blow that budget on its own. Batching keeps the
// check's total duration close to a single request's timeout regardless of
// how many links are checked.
//
// This mirrors the scope of those other providers' checkers: a single
// page's outgoing links, not a recursive site-wide crawl.
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

    return res.error ? { url: link, status: res.status, ok, error: res.error } : { url: link, status: res.status, ok }
  })

  const broken = results.filter((r) => !r.ok)

  const allOk = check(null, {
    'sm-linkcheck: no broken links found': () => broken.length === 0,
  })

  // check() alone never fails a Synthetic Monitoring check: without threshold
  // support, a script full of failing checks still reports probe_success=1.
  // fail() is what actually aborts the iteration and flips the check to
  // failed -- this is the documented Synthetics pattern (check(...) || fail(...)).
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
