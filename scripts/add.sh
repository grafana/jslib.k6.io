#!/bin/bash

set -e


echo -e "\nAdding new lib $1"
yarn add $1

echo -e "\nAdd to support map"
node scripts/add-to-supported.js $1

echo -e "\nCopying lib files"
node scripts/copy-libs.js

echo -e "\nGenerating new homepage"
node scripts/generate-homepage.js

echo "Done"