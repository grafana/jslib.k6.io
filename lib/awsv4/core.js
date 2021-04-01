/* eslint-__ENV node */
/* eslint no-use-before-define: [0, "nofunc"] */
"use strict";

// sources of inspiration:
// https://web-identity-federation-playground.s3.amazonaws.com/js/sigv4.js
// http://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
var crypto = require("k6/crypto");
var http = require("k6/http");

function createCanonicalRequest(
  method,
  pathname,
  query,
  headers,
  payload,
  doubleEscape
) {
  return [
    method.toUpperCase(),
    createCanonicalURI(
      doubleEscape
        ? pathname
          .split(/\//g)
          .map(v => encodeURIComponent(v))
          .join("/")
        : pathname
    ),
    createCanonicalQueryString(query),
    createCanonicalHeaders(headers),
    createSignedHeaders(headers),
    createCanonicalPayload(payload)
  ].join("\n");
};
exports.createCanonicalRequest = createCanonicalRequest;

function createCanonicalURI(uri) {
  var url = uri;
  if (uri[uri.length - 1] == "/" && url[url.length - 1] != "/") {
    url += "/";
  }
  return url;
}

function queryParse(qs) {
  if (typeof qs !== 'string' || qs.length === 0) {
    return {};
  }

  var result = {};

  var split = qs.split("&");
  for (let i = 0; i < split.length; i++) {
    let parts = split[i].split("=");
    if (parts.length === 2) {
      result[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
    } else {
      result[decodeURIComponent(split[i])] = "";
    }
  }
  return result;
}

function createCanonicalPayload(payload) {
  if (payload == "UNSIGNED-PAYLOAD") {
    return payload;
  }
  return hash(payload || "", "hex");
}

function createCanonicalQueryString(params) {
  if (!params) {
    return "";
  }
  if (typeof params == "string") {
    params = queryParse(params);
  }
  return Object.keys(params)
    .sort()
    .map(function (key) {
      var values = Array.isArray(params[key]) ? params[key] : [params[key]];
      return values
        .sort()
        .map(function (val) {
          return encodeURIComponent(key) + "=" + encodeURIComponent(val);
        })
        .join("&");
    })
    .join("&");
};
createCanonicalQueryString = createCanonicalQueryString;

function createCanonicalHeaders(headers) {
  return Object.keys(headers)
    .map(function (name) {
      var values = Array.isArray(headers[name])
        ? headers[name]
        : [headers[name]];
      return (
        name.toLowerCase().trim() +
        ":" +
        values
          .map(function (v) {
            return v.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
          })
          .join(",") +
        "\n"
      );
    })
    .sort()
    .join("");
};
exports.createCanonicalHeaders = createCanonicalHeaders;

function createSignedHeaders(headers) {
  return Object.keys(headers)
    .map(function (name) {
      return name.toLowerCase().trim();
    })
    .sort()
    .join(";");
};
exports.createSignedHeaders = createSignedHeaders;

function createCredentialScope(time, region, service) {
  return [toDate(time), region, service, "aws4_request"].join("/");
};

exports.createCredentialScope = createCredentialScope;

function createStringToSign(time, region, service, request) {
  return [
    "AWS4-HMAC-SHA256",
    toTime(time),
    createCredentialScope(time, region, service),
    hash(request, "hex")
  ].join("\n");
};
exports.createStringToSign = createStringToSign;

function createAuthorizationHeader(
  key,
  scope,
  signedHeaders,
  signature
) {
  return [
    "AWS4-HMAC-SHA256 Credential=" + key + "/" + scope,
    "SignedHeaders=" + signedHeaders,
    "Signature=" + signature
  ].join(", ");
};
exports.createAuthorizationHeader = createAuthorizationHeader;

function createSignature(
  secret,
  time,
  region,
  service,
  stringToSign
) {
  var h1 = hmac("AWS4" + secret, toDate(time), "binary"); // date-key
  var h2 = hmac(h1, region, "binary"); // region-key
  var h3 = hmac(h2, service, "binary"); // service-key
  var h4 = hmac(h3, "aws4_request", "binary"); // signing-key
  return hmac(h4, stringToSign, "hex");
};
exports.createSignature = createSignature;

function createPresignedURL(
  method,
  host,
  path,
  service,
  payload,
  options
) {
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

  // host is required
  options.headers.Host = host;

  var query = options.query ? queryParse(options.query) : {};
  query["X-Amz-Algorithm"] = "AWS4-HMAC-SHA256";
  query["X-Amz-Credential"] =
    options.key +
    "/" +
    createCredentialScope(options.timestamp, options.region, service);
  query["X-Amz-Date"] = toTime(options.timestamp);
  query["X-Amz-Expires"] = options.expires;
  query["X-Amz-SignedHeaders"] = createSignedHeaders(options.headers);

  // when a session token must be "signed" into the canonical request
  // (needed for some services, such as s3)
  if (options.sessionToken && options.signSessionToken) {
    query["X-Amz-Security-Token"] = options.sessionToken;
  }

  var canonicalRequest = createCanonicalRequest(
    method,
    path,
    query,
    options.headers,
    payload,
    options.doubleEscape
  );
  var stringToSign = createStringToSign(
    options.timestamp,
    options.region,
    service,
    canonicalRequest
  );
  var signature = createSignature(
    options.secret,
    options.timestamp,
    options.region,
    service,
    stringToSign
  );
  query["X-Amz-Signature"] = signature;

  // when a session token must NOT be "signed" into the canonical request
  // (needed for some services, such as IoT)
  if (options.sessionToken && !options.signSessionToken) {
    query["X-Amz-Security-Token"] = options.sessionToken;
  } else {
    delete query["X-Amz-Security-Token"];
  }

  return (
    options.protocol + "://" + host + path + "?" + createCanonicalQueryString(query)
  );
};

exports.createPresignedURL = createPresignedURL;

function toTime(time) {
  return new Date(time).toISOString().replace(/[:\-]|\.\d{3}/g, "");
}
exports.toTime = toTime;

function toDate(time) {
  return toTime(time).substring(0, 8);
}

function hmac(key, data, encoding) {
  return crypto.hmac("sha256", key, data, encoding);
}

function hash(string, encoding) {
  return crypto.sha256(string, encoding);
}
