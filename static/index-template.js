#!/usr/bin/env node
const fs = require('fs')
const createFont = require('../scripts/create-base64-font')

const bootstrap = fs.readFileSync('./static/bootstrap.css', 'utf-8')
const styles = fs.readFileSync('./static/styles.css', 'utf-8')
const prisms = fs.readFileSync('./static/prisms.js', 'utf-8')
const header = fs.readFileSync('./static/header.html', 'utf-8')
const jumbo = fs.readFileSync('./static/jumbo.html', 'utf-8')

const DOMAIN = 'https://jslib.k6.io'

const createLink = (name, version, main) => {
  return `<a target="_blank" href="${DOMAIN}/${name}/${version}/${main}">${version}</a>`
}

const versionsTable = () => {
  const supported = require('../supported.json')
  const trs = Object.entries(supported)
    .filter(([_, lib]) => lib.published !== false)
    .map(([name, lib]) => {
      const bundleFilename = lib['bundle-filename'] ?? 'index.js'
      const versionLinks = lib.versions
        .map((version) => createLink(name, version, bundleFilename))
        .join(', ')
      docsLink = lib['docs-url'] ? `<a href="${lib['docs-url']}">${lib['docs-url']}</a>` : ''
      return `<tr>
      <td>${name}</td>
      <td>${versionLinks}</td>
      <td>${docsLink}</td>
    </tr>`
    })
    .join('')

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Version(s)</th>
          <th>Docs</th>
        </tr>
      </thead>
      ${trs}
    </table>
  `
}

const codeExample = (name) => {
  const snippet = fs.readFileSync(`./static/examples/${name}`, 'utf-8')
  return `<pre><code class="code language-js">${snippet}</code></pre>`
}

function renderToString() {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <link rel="preconnect" href="https://fonts.gstatic.com">
      <link href="https://fonts.googleapis.com/css2?family=Roboto+Mono&display=swap" rel="stylesheet">
      <link rel="shortcut icon" href="https://jslib.k6.io/favicon.ico" />
      <title>jslib.k6.io - JS std lib</title>
      <style>
      
        @font-face {
          font-family: 'TTNormsPro';
          font-weight: 600;
          src: ${createFont('tt-pro-bold')}
        }

        @font-face {
          font-family: 'TTNormsPro';
          font-weight: 500;
          src: ${createFont('tt-pro-medium')}
        }
  
        @font-face {
          font-family: 'TTNormsPro';
          font-weight: 400;
          src: ${createFont('tt-pro-regular')}
        }
      </style>
      <style>
        ${bootstrap}
        ${styles}
      </style>
    </head>
    <body>
      ${header}
      ${jumbo}
      <div class="d-none d-sm-none d-md-block" style="margin-top: 240px">&nbsp;</div>
      <main class="page container">
        <section class="page-section">
          <h2>Available libs</h2>
          ${versionsTable()}
        </section>
        <section class="page-section">
          <h2>Examples</h2>
          <p>Importing from jslib.k6.io</p>
          ${codeExample('imports.js')}
          <p>Full script showcase</p>
          ${codeExample('full-script.js')}
        </section>
        <section class="page-section">
          <h2>Resources</h2>
          <ul class="list-unstyled">
            <li>
              <p>
                <a href="https://k6.io/docs/getting-started/installation">Install k6</a>
              </p>
            </li>
            <li>
              <p>
                <a href="https://k6.io/docs/">k6 docs</a>
              </p>
            </li>
            <li>
              <p>
                <a href="https://community.k6.io">Support forum</a>
              </p>
            </li>
          </ul>
        </section>
      </main>
      <script>
        ${prisms}
      </script>
    </body>
    </html>
  `
}

module.exports = { renderToString }
