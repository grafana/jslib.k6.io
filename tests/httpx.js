import { check } from 'k6'
import { Httpx, Get } from '../lib/httpx/0.0.6/index.js'
import { describe } from '../lib/expect/0.0.4/index.js'

function httpxBatchTest() {
  let session = new Httpx({ baseURL: 'https://test-api.k6.io' })

  let responses = session.batch(
    [new Get('/public/crocodiles/3/'), new Get('/public/crocodiles/4/')],
    {
      tags: { name: 'PublicCrocs' },
    }
  )

  responses.forEach((response) => {
    check(response, {
      'httpx valid status': (r) => r.status === 200,
    })
  })
}

function httpxTestAbsoluteURLs() {
  let session = new Httpx({ baseURL: 'https://test-api.k6.io' })

  describe('Absolute URLs override the baseURL', (t) => {
    let relativeURL = session.get('/public/crocodiles/1') //
    let absoluteURL = session.get('https://httpbin.test.k6.io/get') // should work.

    t.expect(relativeURL.status).as('relative URL').toEqual(200)
    t.expect(absoluteURL.status).as('absolute URL').toEqual(200)
  })
}

export { httpxBatchTest, httpxTestAbsoluteURLs }
