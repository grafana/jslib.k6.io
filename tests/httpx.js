import { check } from 'k6';
import { Httpx, Get } from "../lib/httpx/0.0.1/index.js";

export let options = {
  thresholds: {
    checks: [{threshold: 'rate == 1.00', abortOnFail: true}],
  },
  vus: 1,
  iterations: 1,
};



let session = new Httpx();
session.setBaseUrl('https://test-api.k6.io');

export default function testSuite() {

  let responses = session.batch([
    new Get('/public/crocodiles/3/'),
    new Get('/public/crocodiles/4/'),
  ], {
    tags: {name: 'PublicCrocs'},
  });

  responses.forEach(response => {
    console.log(JSON.stringify(response))

    check(response, {
      'valid status': (r) => r.status === 200
    })
  });


}


