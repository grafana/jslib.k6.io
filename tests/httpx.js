import { check } from 'k6';
import { Httpx, Get } from "../lib/httpx/0.0.1/index.js";

function httpxBatchTest() {
  let session = new Httpx({baseURL: 'https://test-api.k6.io'});

  let responses = session.batch([
    new Get('/public/crocodiles/3/'),
    new Get('/public/crocodiles/4/'),
  ], {
    tags: {name: 'PublicCrocs'},
  });

  responses.forEach(response => {
    check(response, {
      'httpx valid status': (r) => r.status === 200
    })
  });
}

export {
  httpxBatchTest
}
