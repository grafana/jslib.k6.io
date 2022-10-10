#!/usr/bin/env node
const fs = require('fs')
const { renderToString } = require('../static/index-template')

function main() {
  fs.writeFileSync('./lib/index.html', renderToString())
  fs.copyFileSync('./static/favicon.ico', './lib/favicon.ico')

  console.log('New index.html generated')
}

main()
