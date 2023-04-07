import http from 'k6/http';


const validMethods = ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'CONNECT', 'OPTIONS', 'TRACE', 'PATCH'];

function isHttpUrl(obj){  // detects type of http.url`http://example.com/{$id}`
  return typeof obj == 'object' 
    && 'name' in obj 
    && 'url' in obj
    && 'clean_url' in obj
}

function isAbsoluteUrl(url) {
  return url.startsWith('http');
}

class Request {
  constructor(method, url, params) {
    params = params || {};
    this.method = method;
    this.url = url;
    this.body = params['body'] || null;
    delete params['body'];
    this.params = params || {};

    if(isHttpUrl(url)){
      this.url = url.url
      this.addTag('name', url.name)
    }

  }

  addHeader(name, value) {
    this.params.headers = Object.assign({}, this.params.headers, {[name]: value});
    return this;
  }

  addTag(name, value) {
    this.params.tags = Object.assign({}, this.params.tags, {[name]: value});
    return this;
  }
}

class Get extends Request {
  constructor(url, params) {
    super('GET', url, params)
  }
}

class Head extends Request {
  constructor(url, params) {
    super('HEAD', url, params)
  }
}

class Post extends Request {
  constructor(url, params) {
    super('POST', url, params)
  }
}

class Put extends Request {
  constructor(url, params) {
    super('PUT', url, params)
  }
}

class Delete extends Request {
  constructor(url, params) {
    super('DELETE', url, params)
  }
}

class Connect extends Request {
  constructor(url, params) {
    super('CONNECT', url, params)
  }
}

class Options extends Request {
  constructor(url, params) {
    super('OPTIONS', url, params)
  }
}

class Trace extends Request {
  constructor(url, params) {
    super('TRACE', url, params)
  }
}

class Patch extends Request {
  constructor(url, params) {
    super('PATCH', url, params)
  }
}

class Httpx {

  constructor(opts={}) {
    let _deconstructedParams = ['baseURL', 'errorMetricCondition', 'headers', 'tags', 'errorMetric'];

    let {
      baseURL = '',
      errorMetricCondition = (r) => r.status >= 200 && r.status <= 399,
      errorMetric = null,
      headers = {},
      tags = {},
      enableHttpReqErrorMetric = false,
    } = opts;

    this.k6params = {
      headers: headers,
      tags: tags,
    };

    let otherK6Params = opts;
    _deconstructedParams.forEach((o) => {
      delete otherK6Params[o];
    });

    this.k6params = Object.assign(this.k6params, otherK6Params);

    this.baseURL = baseURL;
    this.lastRequest = {
      responseObject: null,
      responseChainDuration: null,
    };
    this.errorMetric = errorMetric;
    // this.errorMetric.add(0); // workaround for a k6 bug.
    this.errorMetricCondition = errorMetricCondition;
  }

  postRequestHook(response, params, start_t, end_t){
    if(this.errorMetric){
      let expectCondition = params.expect || this.errorMetricCondition;
      let wasSuccessful = expectCondition(response);
      this.errorMetric.add(!wasSuccessful);
    }

    this.lastRequest.responseObject = response;
    this.lastRequest.responseChainDuration = end_t - start_t;
  }

  get lastRequestChainDuration(){
    return this.lastRequest.responseChainDuration
  }

  setBaseUrl(baseURL) {
    this.baseURL = baseURL;
  }

  addHeaders(headers) {
    this.k6params.headers = Object.assign(this.k6params.headers, headers);
  }

  addHeader(name, value) {
    this.k6params.headers = Object.assign(this.k6params.headers, {[name]: value});
  }

  addTags(tags) {
    this.k6params.tags = Object.assign(this.k6params.tags, tags);
  }

  addTag(name, value) {
    this.k6params.tags = Object.assign(this.k6params.tags, {[name]: value});
  }

  clearTag(name) {
    delete this.k6params.tags[name]
  }

  clearHeader(name) {
    delete this.k6params.headers[name]
  }

  _merge_params(params1, params2) {
    // params2 overrides params1

    params1 = params1 || {};
    params2 = params2 || {};

    let new_params = Object.assign({}, params1, params2);

    //merge headers and tags from both.
    new_params.headers = Object.assign({}, params1.headers || {}, params2.headers || {});
    new_params.tags = Object.assign({}, params1.tags || {}, params2.tags || {});

    return new_params;
  }

  _getMergedSessionParams(req_params) {
    return this._merge_params(this.k6params, req_params)
  }

  execute(r) {
    return this.request(r.method, r.url, r.body, r.params);
  }

  validateMethod(method) {
    if (!validMethods.includes(method))
      throw new Error(`Invalid method: ${method}. Expected one of ${validMethods}`);
  }

  request(method, url, body, params) {
    if(arguments.length < 2){
      throw new Error("Invalid number of arguments for request(). Provide at least Method and URL.");
    }

    this.validateMethod(method);

    params = this._getMergedSessionParams(params);

    if(isHttpUrl(url)){
      params.tags['name'] = url.name;
      url = url.url
    }

    if(!isAbsoluteUrl(url)){
      url = this.baseURL + url;
    }

    let start_t = new Date();
    let resp = http.request(method, url, body, params);
    let end_t = new Date();

    this.postRequestHook(resp, params, start_t, end_t);
    return resp;
  }

  asyncRequest(method, url, body, params) {
    if(arguments.length < 2){
      throw new Error("Invalid number of arguments for asyncRequest(). Provide at least Method and URL.");
    }

    this.validateMethod(method);

    params = this._getMergedSessionParams(params);

    if (isHttpUrl(url)) {
        params.tags['name'] = url.name;
        url = url.url
    }

    if (!isAbsoluteUrl(url)) {
        url = this.baseURL + url;
    }

    let promise = http.asyncRequest(method, url, body, params);
    return promise;
  }

  // synchronous helpers, don't need to be awaited.
  get(url, body, params) {
    return this.request('GET', url, body, params)
  }

  head(url, body, params) {
    return this.request('HEAD', url, body, params)
  }

  post(url, body, params) {
    return this.request('POST', url, body, params)
  }

  put(url, body, params) {
    return this.request('PUT', url, body, params)
  }

  delete(url, body, params) {
    return this.request('DELETE', url, body, params)
  }

  connect(url, body, params) {
    return this.request('CONNECT', url, body, params)
  }

  options(url, body, params) {
    return this.request('OPTIONS', url, body, params)
  }

  trace(url, body, params) {
    return this.request('TRACE', url, body, params)
  }

  patch(url, body, params) {
    return this.request('PATCH', url, body, params)
  }

  // async helpers, returning promises. Must be awaited on the client side.
  asyncGet(url, body, params) {
    return this.asyncRequest('GET', url, body, params)
  }

  asyncHead(url, body, params) {
    return this.asyncRequest('HEAD', url, body, params)
  }

  asyncPost(url, body, params) {
    return this.asyncRequest('POST', url, body, params)
  }

  asyncPut(url, body, params) {
    return this.asyncRequest('PUT', url, body, params)
  }

  asyncDelete(url, body, params) {
    return this.asyncRequest('DELETE', url, body, params)
  }

  asyncConnect(url, body, params) {
    return this.asyncRequest('CONNECT', url, body, params)
  }

  asyncOptions(url, body, params) {
    return this.asyncRequest('OPTIONS', url, body, params)
  }

  asyncTrace(url, body, params) {
    return this.asyncRequest('TRACE', url, body, params)
  }

  asyncPatch(url, body, params) {
    return this.asyncRequest('PATCH', url, body, params)
  }

  batch(array_of_requests, batch_shared_params) { // common_params
    /*
    elements of array_of_requests can be arrays [] or Request objects
     */
    let reqs_with_params = [];

    array_of_requests.forEach((element) => {
      if (Array.isArray(element)) {
        let method = element[0];
        let url = this.baseURL + element[1];
        let body = element[2];
        let request_params = this._merge_params(batch_shared_params, element[3]);
        reqs_with_params.push([method, url, body || null, this._getMergedSessionParams(request_params)])
      }
      else if (element instanceof Request) {
        let method = element.method;
        let url = this.baseURL + element.url;
        let body = element.body;
        let request_params = this._merge_params(batch_shared_params, element.params);
        reqs_with_params.push([method, url, body, this._getMergedSessionParams(request_params)])
      }
    });

    let start = new Date();
    let resp = http.batch(reqs_with_params);
    let end = new Date();
    this.lastRequest.responseObject = resp;
    this.lastRequest.responseChainDuration = end - start;
    return resp;
  }
}

export {
  Httpx,
  Request,
  Get,
  Head,
  Post,
  Put,
  Delete,
  Connect,
  Options,
  Trace,
  Patch,
}
