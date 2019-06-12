#!/usr/bin/env node
const fs = require("fs");
const { renderToString } = require("../static/index-template");


function main() {
  fs.writeFileSync('./lib/index.html', renderToString());
  console.log("New index.html generated");
}

main();
