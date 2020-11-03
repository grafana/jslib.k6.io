import { check, group } from 'k6'
import { URL, URLSearchParams } from '../lib/url/1.0.0/index.js'

export function URLWebAPI() {
  group('core-js URL & URLSearchParams', () => {
    check(
      {},
      {
        'new URL() serializes properly': () =>
          new URL('https://test.k6.io/?foo=bar').toString() === 'https://test.k6.io/?foo=bar',
      }
    )

    check(
      {},
      {
        'new URLSearchParams() serializes properly': () =>
          new URLSearchParams([
            ['foo', 'bar'],
            ['k6', '123'],
            ['k6', 'is the best'],
          ]).toString() === 'foo=bar&k6=123&k6=is+the+best',
      }
    )
  })
}
