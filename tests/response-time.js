import { sleep } from 'k6'
import http from 'k6/http'

export let options = {
  duration: '2m',
  vus: 20,
  ext: {
    loadimpact: {
      distribution: {
        us: { loadZone: 'amazon:us:ashburn', percent: 25 },
        uk: { loadZone: 'amazon:gb:london', percent: 25 },
        eu: { loadZone: 'amazon:de:frankfurt', percent: 25 },
        asia: { loadZone: 'amazon:jp:tokyo', percent: 25 },
      },
    },
  },
}

const TEST_URL_CDN = 'http://k6-simon-cdn.loadimpact.com/jsonpath/1.0.2/index.js'
const TEST_URL_NO_CDN = 'http://k6-simon.loadimpact.com/jsonpath/1.0.2/index.js'

function requestSpec(url, tags) {
  return ['GET', url, null, { tags }]
}

export default function () {
  http.batch([
    requestSpec(TEST_URL_CDN, { cdn: true }),
    requestSpec(TEST_URL_NO_CDN, { cdn: false }),
  ])

  sleep(1)
}
