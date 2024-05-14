// This code specifically uses commonJS as to be faster loading in k6
// this can be changed after https://github.com/grafana/k6/issues/3265
const http = require("k6/http");
const crypto = require("k6/crypto");
const execution = require("k6/execution");

// saving the original values
const request = http.request;
const asyncRequest = http.asyncRequest;

const propagatorMap = {
  "w3c": (sampler, traceID) => {
    return {
      "traceparent": `00-${traceID}-${randHexString(16)}-${sampler() ? "01" : "00"}`
    }
  },
  "jaeger": (sampler, traceID) => {
    return {
      "uber-trace-id": `${traceID}:${randHexString(8)}:0:${sampler() ? "1" : "0"}`,
    }
  },
}

class Client {
  #propagator;
  #sampler;

  constructor(opts) {
    this.configure(opts)
  }

  configure(opts) {
    this.#sampler = newProbalisticSampler(opts.sampling);
    this.#propagator = propagatorMap[opts.propagator];
    if (this.#propagator == null) {
      throw "unknown propagator: " + opts.propagator
    }
  }

  // request instruments the http module's request function with tracing headers,
  // and ensures the trace_id is emitted as part of the output's data points metadata.
  request(method, url, ...args) {
    const traceID = newTraceID()
    const traceContextHeader = this.#propagator(this.#sampler, traceID)
    args = instrumentArguments(traceContextHeader, ...args)

    try {
      execution.vu.metrics.metadata["trace_id"] = traceID
      return request(method, url, ...args)
    } finally {
      delete execution.vu.metrics.metadata["trace_id"]

    }
  }

  // asyncRequest instruments the http module's asyncRequest function with tracing headers,
  // and ensures the trace_id is emitted as part of the output's data points metadata.
  async asyncRequest(method, url, ...args) {
    const traceID = newTraceID()
    const traceContextHeader = this.#propagator(this.#sampler, traceID)
    args = instrumentArguments(traceContextHeader, ...args)

    let promise;
    try {
      execution.vu.metrics.metadata["trace_id"] = traceID
      promise = asyncRequest(method, url, ...args)
    } finally {
      delete execution.vu.metrics.metadata["trace_id"]
    }

    return await promise;
  }

  del(url, ...args) { return this.request("DELETE", url, ...args) }
  get(url, ...args) { return this.request("GET", url, null, ...args) }
  head(url, ...args) { return this.request("HEAD", url, null, ...args) }
  options(url, ...args) { return this.request("OPTIONS", url, ...args) }
  patch(url, ...args) { return this.request("PATCH", url, ...args) }
  post(url, ...args) { return this.request("POST", url, ...args) }
  put(url, ...args) { return this.request("PUT", url, ...args) }
}

function longToByteArray(long) {
  var byteArray = new Uint8Array(8)

  for (var index = byteArray.byteLength; index >= 0; index--) {
    const byte = long % 256
    byteArray[index] = byte
    long = (long-byte)/256;
    if (long < 1) {
      break
    }
  }

  return byteArray;
}
function instrumentArguments(traceContext, ...args) {
  switch (args.length) {
    case 0:
      args.push(null)
    // fallthrough to add the header
    case 1:
      // We only received a body argument
      args.push({ headers: traceContext })
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
      Object.assign(params.headers, traceContext)
      break;
  }

  return args
}


function newTraceID() {
  let result = "dc0718" // prefix for k6

  // add nanoseconds
  let now = Date.now()
  const ns = longToByteArray(now * 1e6) // this is very likely ... loosy
  let n = 3
  let i = 0
  for (; i < ns.byteLength; i++) { // skip leading zeros
    if (ns[i] == 0) continue;
    break;
  }
  for (; i < ns.byteLength; i++) {
    result += ns[i].toString(16).padStart(2, "0")
    n++;
  }

  // pad with random
  let random = new Uint8Array(crypto.randomBytes(16 - n));
  for (i=0; i < random.byteLength; i++) {
    result += random[i].toString(16).padStart(2, "0")
    n++;
  }

  return result
}

function newProbalisticSampler(samplingRate) {
  if (samplingRate < 0 || samplingRate > 1) {
    throw "sampling rate must be between 0.0 and 1.0"
  }
  if (typeof samplingRate == 'undefined') {
    samplingRate = 1

  }
  switch (samplingRate) {
    case 0:
      return () => false
    case 1:
      return () => true
    default:
      return () => Math.random() < samplingRate
  }
}

const digits = "0123456789abcdef";

function randHexString(n) {
  let result = '';
  for (let i = 0; i < n; ++i) {
    result += digits[Math.floor(16 * Math.random())];
  }
  return result;
}

function instrumentHTTP(opts) {
  const client = new Client(opts)

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
