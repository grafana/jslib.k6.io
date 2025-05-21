#!/bin/bash

set -e

# rm -rf dist
# mkdir dist
# cp -r lib/* dist

if [ -z $AWS_ACCESS_KEY_ID ] || [ -z $AWS_SECRET_ACCESS_KEY ]; then
    echo "No AWS keys set. Exiting..."
    exit
fi

aws s3 sync --delete lib/ s3://${S3_BUCKET_ID} --exclude "index.src.js"
aws cloudfront create-invalidation --distribution-id ${CLOUDFRONT_DISTRIBUTION_ID} --paths "/*"
