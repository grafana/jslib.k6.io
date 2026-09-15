import { check } from 'k6'
import { checkLinks, extractLinks } from '../lib/sm-linkcheck/0.1.0/index.js'

const fixtureHTML = `
  <html>
    <body>
      <a href="https://example.com/absolute">absolute</a>
      <a href="/root-relative">root relative</a>
      <a href="relative/page">relative</a>
      <a href="#section">anchor, should be ignored</a>
      <a href="mailto:test@example.com">mailto, should be ignored</a>
      <a href="https://example.com/absolute">duplicate, should be deduped</a>
    </body>
  </html>
`

export function LinkcheckExtractLinks() {
  const links = extractLinks(fixtureHTML, 'https://example.com/some/page')

  check(links, {
    'finds the expected number of links': (l) => l.length === 3,
    'keeps absolute links untouched': (l) => l.includes('https://example.com/absolute'),
    'resolves root-relative links against the origin': (l) =>
      l.includes('https://example.com/root-relative'),
    'resolves relative links against the page directory': (l) =>
      l.includes('https://example.com/some/relative/page'),
  })
}

export function LinkcheckIsFunction() {
  check(null, {
    'checkLinks is a function': () => typeof checkLinks === 'function',
  })
}
