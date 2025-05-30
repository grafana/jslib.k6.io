// This code specifically uses commonJS as to be faster loading in k6
// this can be changed after https://github.com/grafana/k6/issues/3265
const http = require("k6/http");
const execution = require("k6/execution");

function pyroBaggage(url, _, params) {
  return { baggage: [
    `k6.test_run_id=${__ENV.K6_CLOUDRUN_TEST_RUN_ID}`,
    `k6.scenario=${execution.scenario.name}`,
    `k6.name=${params?.tags?.name ? params.tags.name : url}`,
  ]}
}

// mergeHeaders merges two sets of HTTP headers into a single set.
// Whenever both sets contain a header with the same key, the values are into a list rather than replaced.
function mergeHeaders(dst, src) {
  for (const key in src) {
    dst[key] = [].concat(dst[key] || [], src[key]);
  }

  return dst;
}

class Client {
  generateHeaders;
  #originalRequest;
  #originalAsyncRequest;

  constructor(generateHeaders, originalRequest = http.request, originalAsyncRequest = http.asyncRequest) {
    if (generateHeaders == null) {
      generateHeaders = pyroBaggage
    }
    this.generateHeaders = generateHeaders
    this.#originalRequest = originalRequest;
    this.#originalAsyncRequest = originalAsyncRequest;
  }

  // request instruments the http module's request function with tracing headers,
  // and ensures the trace_id is emitted as part of the output's data points metadata.
  request(method, url, ...args) {
    let headers = this.generateHeaders(url, ...args)
    return this.#originalRequest(method, url, ...instrumentArguments(headers, ...args));
  }

  // asyncRequest instruments the http module's asyncRequest function with tracing headers,
  // and ensures the trace_id is emitted as part of the output's data points metadata.
  async asyncRequest(method, url, ...args) {
    await this.#originalAsyncRequest(method, url, ...instrumentArguments(this.generateHeaders(url, ...args), ...args));
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
      args[1].headers = mergeHeaders(args[1].headers || {}, headers)

      break;
  }

  return args
}

function instrumentHTTP() {
  // capture the original values late, so that they include any previously made instrumentation changes
  const currentRequest = http.request;
  const currentAsyncRequest = http.asyncRequest;

  const client = new Client(null, currentRequest, currentAsyncRequest);

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
