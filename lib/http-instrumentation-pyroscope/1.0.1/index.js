// This code specifically uses commonJS as to be faster loading in k6
// this can be changed after https://github.com/grafana/k6/issues/3265
const http = require("k6/http");
const execution = require("k6/execution");

// saving the original values
const request = http.request;
const asyncRequest = http.asyncRequest;

function pyroBaggage(url, _, params) {
  return { baggage: `k6.test_run_id=${__ENV.K6_CLOUDRUN_TEST_RUN_ID}, k6.scenario=${execution.scenario.name}, k6.name=${params?.tags?.name ? params.tags.name : url}` }
}

class Client {
  generateHeaders;

  constructor(generateHeaders) {
    if (generateHeaders == null) {
      generateHeaders = pyroBaggage
    }
    this.generateHeaders = generateHeaders
  }

  // request instruments the http module's request function with tracing headers,
  // and ensures the trace_id is emitted as part of the output's data points metadata.
  request(method, url, ...args) {
    let headers = this.generateHeaders(url, ...args)
    return request(method, url, ...instrumentArguments(headers, ...args));
  }

  // asyncRequest instruments the http module's asyncRequest function with tracing headers,
  // and ensures the trace_id is emitted as part of the output's data points metadata.
  async asyncRequest(method, url, ...args) {
    await asyncRequest(method, url, ...instrumentArguments(this.generateHeaders(url, ...args), ...args));
  }

  del(url, ...args) { return this.request("DELETE", url, ...args) }
  get(url, ...args) { return this.request("GET", url, null, ...args) }
  head(url, ...args) { return this.request("HEAD", url, null, ...args) }
  options(url, ...args) { return this.request("OPTIONS", url, ...args) }
  patch(url, ...args) { return this.request("PATCH", url, ...args) }
  post(url, ...args) { return this.request("POST", url, ...args) }
  put(url, ...args) { return this.request("PUT", url, ...args) }
}

function instrumentArguments(headers, ...args) {
  switch (args.length) {
    case 0:
      args.push(null)
    // fallthrough to add the header
    case 1:
      // We only received a body argument
      args.push({ headers: headers })
      break;
    default: // this handles 2 and more just in case someone provided more arguments
      // We received both a body and a params argument. In the
      // event params would be nullish, we'll instantiate
      // a new object.
      if (args[1] == null) args[1] = {}

      let params = args[1]
      if (params.headers == null) {
        params.headers = {}
      }
      Object.assign(params.headers, headers)
      break;
  }

  return args
}

function instrumentHTTP() {
  const client = new Client()

  http.del = client.del.bind(client);
  http.get = client.get.bind(client);
  http.head = client.head.bind(client);
  http.options = client.options.bind(client);
  http.patch = client.patch.bind(client);
  http.post = client.post.bind(client);
  http.put = client.put.bind(client);
  http.request = client.request.bind(client)
  http.asyncRequest = client.asyncRequest.bind(client)
}

const exp = { Client: Client, instrumentHTTP: instrumentHTTP };

module.exports = {
  default: exp,
  __esModule: true,
  ...exp
}
