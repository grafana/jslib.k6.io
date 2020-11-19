import { createSignedHeaders, createCredentialScope, createCanonicalRequest, createStringToSign, createSignature } from "./core.js"

function fillOptions(options) {
    options = options || {};
    options.key = options.key || __ENV.AWS_ACCESS_KEY_ID;
    options.secret = options.secret || __ENV.AWS_SECRET_ACCESS_KEY;
    options.sessionToken = options.sessionToken || __ENV.AWS_SESSION_TOKEN;
    options.protocol = options.protocol || "https";
    options.timestamp = options.timestamp || Date.now();
    options.region = options.region || __ENV.AWS_REGION || "us-east-1";
    options.expires = options.expires || 86400; // 24 hours
    options.headers = options.headers || {};
    options.signSessionToken = options.signSessionToken || false;
    options.doubleEscape =
        options.doubleEscape !== undefined ? options.doubleEscape : true;
    return options;
}

function signWithHeaders(method, service, region, target, path="", body=null, query="", headers= {}) {
    var options = {headers: headers }
    options = fillOptions(options);

    options.headers["X-Amz-Target"] = target;
    options.headers["Content-Type"] = "application/x-amz-json-1.1";
    var credential = options.key +
        "/" +
        createCredentialScope(options.timestamp, region, service);
    var signedHeaders = createSignedHeaders(options.headers);
    var signature = generateSignature(
        service, method, path, query, body,
        options.headers, options.doubleEscape, options.timestamp, region, options.secret);

    var signatureHeader = "AWS4-HMAC-SHA256 Credential=".concat(
        credential, 
        " SignedHeaders=" ,
        signedHeaders,
        " Signature=",
        signature,
    )

    options.headers["Authorization"] = signatureHeader;
    if (query != "" ){
        query = "?"+ query;
    }
    var url = options.protocol.concat( "://", service ,".", region, ".amazonaws.com/", path, query)

    return {
        url: url,
        headers: options.headers,
    }
}
exports.signWithHeaders=signWithHeaders;

function generateSignature(service, method, path ,query, body, headers, doubleEscape, timestamp, region, secret) {

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
