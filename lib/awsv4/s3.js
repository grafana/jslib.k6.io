var createPresignedURL = require("./core.js").createPresignedURL;

function createPresignedS3URL(name, options) {
  options = options || {};
  options.method = options.method || "GET";
  options.bucket = options.bucket || __ENV.AWS_S3_BUCKET;
  options.signSessionToken = true;
  options.doubleEscape = false;
  return createPresignedURL(
    options.method,
    options.bucket + ".s3.amazonaws.com",
    "/" + name,
    "s3",
    "UNSIGNED-PAYLOAD",
    options
  );
};

exports.createPresignedS3URL = createPresignedS3URL;
