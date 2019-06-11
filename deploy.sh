#!/bin/bash

set -e

# rm -rf dist
# mkdir dist
# cp -r lib/* dist

export AWS_ENV="production"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID=$PRODUCTION_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$PRODUCTION_SECRET_ACCESS_KEY

if [ -z $AWS_ACCESS_KEY_ID ] || [ -z $AWS_SECRET_ACCESS_KEY ]; then
    echo "No AWS keys set. Exiting..."
    exit
fi

# Change cname to lib.k6.io
aws s3 sync --delete lib/ s3://jslib.k6.io
aws cloudfront create-invalidation --distribution-id EAWDELBNGDLKP --paths "/*"
