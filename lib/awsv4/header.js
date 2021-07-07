import { createSignedHeaders, createCredentialScope, createCanonicalRequest, createStringToSign, createSignature, toTime } from "./core.js"

function fillOptions(options) {
  options = options || {};
  options.key = options.key || __ENV.AWS_ACCESS_KEY_ID;
  options.secret = options.secret || __ENV.AWS_SECRET_ACCESS_KEY;
  options.sessionToken = options.sessionToken || __ENV.AWS_SESSION_TOKEN;
  options.protocol = options.protocol || "https";
  options.timestamp = options.timestamp || Date.now();
  options.region = options.region || __ENV.AWS_REGION || __ENV.AWS_DEFAULT_REGION;
  options.expires = options.expires || 86400; // 24 hours
  options.headers = options.headers || {};
  options.signSessionToken = options.signSessionToken || false;
  options.doubleEscape =
    options.doubleEscape !== undefined ? options.doubleEscape : true;
  return options;
}

function signWithHeaders(method, service, region = "", target = "", path = "", body = null, query = "", headers = {}, serviceSubdomain = null) {
  var options = { headers: headers, region:region }
  options = fillOptions(options);
  options.headers["X-Amz-Date"] = toTime(options.timestamp)
  if (serviceSubdomain === null) {
    serviceSubdomain = service
  }
  var host = serviceSubDomain.concat(".", options.region, ".amazonaws.com")
  options.headers["Host"] = host

  if (options.sessionToken) {
    options.headers["X-Amz-Security-Token"] = options.sessionToken
  }

  if (target) {
    options.headers["X-Amz-Target"] = target;
  }

  var credential = options.key +
    "/" +
    createCredentialScope(options.timestamp, options.region, service);
  var signedHeaders = createSignedHeaders(options.headers);
  var signature = generateSignature(
    service, method, path, query, body,
    options.headers, options.doubleEscape, options.timestamp, options.region, options.secret);

  var signatureHeader = "AWS4-HMAC-SHA256 Credential=".concat(
    credential,
    ", SignedHeaders=",
    signedHeaders,
    ", Signature=",
    signature,
  )

  options.headers["Authorization"] = signatureHeader;

  if (query != "") {
    query = "?" + query;
  }

  var url = options.protocol.concat("://", host, path, query)
  return {
    url: url,
    headers: options.headers,
  }
}
exports.signWithHeaders = signWithHeaders;

function generateSignature(service, method, path, query, body, headers, doubleEscape, timestamp, region, secret) {

  var canonicalRequest = createCanonicalRequest(
    method,
    path,
    query,
    headers,
    body,
    doubleEscape
  );

  var stringToSign = createStringToSign(
    timestamp,
    region,
    service,
    canonicalRequest
  );

  var signature = createSignature(
    secret,
    timestamp,
    region,
    service,
    stringToSign
  );

  return signature
}
