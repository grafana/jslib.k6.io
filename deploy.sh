#!/bin/bash

set -ev

# rm -rf dist
# mkdir dist
# cp -r lib/* dist

# Change cname to lib.k6.io
aws s3 sync --delete lib/ s3://k6-simon-cdn.loadimpact.com
# aws cloudfront create-invalidation --distribution-id EIZYH47FAJWWT --paths "/*"

