#!/bin/bash

echo "\nAdding new lib $1"

yarn add $s1

echo "\nCopying lib files"
node scripts/copy-libs.js

echo "\nGenerating new homepage"
node scripts/generate-homepage.js

echo "\nDone"