#!/usr/bin/env node
const fs = require("fs");

const styles = fs.readFileSync("./static/styles.css", "utf-8");
const prisms = fs.readFileSync("./static/prisms.js", "utf-8");
const logo = fs.readFileSync("./static/logo.svg", "utf-8");

const DOMAIN = "https://jslib.k6.io";

const createLink = (name, version, main) => {
  return `<a target="_blank" href="${DOMAIN}/${name}/${version}/${main}">${version}</a>`;
};

const versionsTable = () => {
  const supported = require("../supported.json");
  const trs = Object.entries(supported)
    .map(([name, versionsMap]) => {
      const versionLinks = Object.keys(versionsMap)
        .map(version => createLink(name, version, "index.js"))
        .join(", ");
      return `<tr>
      <td>${name}</td>
      <td>${versionLinks}</td>
    </tr>`;
    })
    .join("");

  return `
    <table class="table">
      ${trs}
    </table>
  `;
};

const codeExample = name => {
  const snippet = fs.readFileSync(`./static/examples/${name}`, "utf-8");
  return `<pre><code class="code language-js">${snippet}</code></pre>`;
};

function renderToString() {
  const markup = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" rel="stylesheet">
      <link rel="shortcut icon" href="https://jslib.k6.io/favicon.ico" />
      <title>jslib.k6.io - JS std lib</title>
      <style>${styles}</style>
    </head>
    <body>
      <main class="page">
        <header class="header">
          <div class="logo">
            ${logo}
          </div>
          <div>
            <h1 class="title"><span class="text-yellow">js</span>lib.<span class="text-blue">k6</span>.io</h1>
            <p class="description">Useful utility libs for k6 scripts</p>
          </div>
          <ul class="header-icons">
            <li>
              <a href="https://github.com/loadimpact/jslib.k6.io">
                <svg height="20" width="20" aria-hidden="true" focusable="false" viewBox="0 0 496 512">
                  <path fill="currentColor" d="M165.9 397.4c0 2-2.3 3.6-5.2 3.6-3.3.3-5.6-1.3-5.6-3.6 0-2 2.3-3.6 5.2-3.6 3-.3 5.6 1.3 5.6 3.6zm-31.1-4.5c-.7 2 1.3 4.3 4.3 4.9 2.6 1 5.6 0 6.2-2s-1.3-4.3-4.3-5.2c-2.6-.7-5.5.3-6.2 2.3zm44.2-1.7c-2.9.7-4.9 2.6-4.6 4.9.3 2 2.9 3.3 5.9 2.6 2.9-.7 4.9-2.6 4.6-4.6-.3-1.9-3-3.2-5.9-2.9zM244.8 8C106.1 8 0 113.3 0 252c0 110.9 69.8 205.8 169.5 239.2 12.8 2.3 17.3-5.6 17.3-12.1 0-6.2-.3-40.4-.3-61.4 0 0-70 15-84.7-29.8 0 0-11.4-29.1-27.8-36.6 0 0-22.9-15.7 1.6-15.4 0 0 24.9 2 38.6 25.8 21.9 38.6 58.6 27.5 72.9 20.9 2.3-16 8.8-27.1 16-33.7-55.9-6.2-112.3-14.3-112.3-110.5 0-27.5 7.6-41.3 23.6-58.9-2.6-6.5-11.1-33.3 2.6-67.9 20.9-6.5 69 27 69 27 20-5.6 41.5-8.5 62.8-8.5s42.8 2.9 62.8 8.5c0 0 48.1-33.6 69-27 13.7 34.7 5.2 61.4 2.6 67.9 16 17.7 25.8 31.5 25.8 58.9 0 96.5-58.9 104.2-114.8 110.5 9.2 7.9 17 22.9 17 46.4 0 33.7-.3 75.4-.3 83.6 0 6.5 4.6 14.4 17.3 12.1C428.2 457.8 496 362.9 496 252 496 113.3 383.5 8 244.8 8zM97.2 352.9c-1.3 1-1 3.3.7 5.2 1.6 1.6 3.9 2.3 5.2 1 1.3-1 1-3.3-.7-5.2-1.6-1.6-3.9-2.3-5.2-1zm-10.8-8.1c-.7 1.3.3 2.9 2.3 3.9 1.6 1 3.6.7 4.3-.7.7-1.3-.3-2.9-2.3-3.9-2-.6-3.6-.3-4.3.7zm32.4 35.6c-1.6 1.3-1 4.3 1.3 6.2 2.3 2.3 5.2 2.6 6.5 1 1.3-1.3.7-4.3-1.3-6.2-2.2-2.3-5.2-2.6-6.5-1zm-11.4-14.7c-1.6 1-1.6 3.6 0 5.9 1.6 2.3 4.3 3.3 5.6 2.3 1.6-1.3 1.6-3.9 0-6.2-1.4-2.3-4-3.3-5.6-2z"></path>
                </svg>
              </a>
            </li>
            <li>
              <a href="https://twitter.com/k6_io">
                <svg height="20" width="20" aria-hidden="true" focusable="false" viewBox="0 0 512 512">
                  <path fill="currentColor" d="M459.37 151.716c.325 4.548.325 9.097.325 13.645 0 138.72-105.583 298.558-298.558 298.558-59.452 0-114.68-17.219-161.137-47.106 8.447.974 16.568 1.299 25.34 1.299 49.055 0 94.213-16.568 130.274-44.832-46.132-.975-84.792-31.188-98.112-72.772 6.498.974 12.995 1.624 19.818 1.624 9.421 0 18.843-1.3 27.614-3.573-48.081-9.747-84.143-51.98-84.143-102.985v-1.299c13.969 7.797 30.214 12.67 47.431 13.319-28.264-18.843-46.781-51.005-46.781-87.391 0-19.492 5.197-37.36 14.294-52.954 51.655 63.675 129.3 105.258 216.365 109.807-1.624-7.797-2.599-15.918-2.599-24.04 0-57.828 46.782-104.934 104.934-104.934 30.213 0 57.502 12.67 76.67 33.137 23.715-4.548 46.456-13.32 66.599-25.34-7.798 24.366-24.366 44.833-46.132 57.827 21.117-2.273 41.584-8.122 60.426-16.243-14.292 20.791-32.161 39.308-52.628 54.253z"></path>
                </svg>
              </a>
            </li>
          </ul>
        </header>
        <section class="page-section">
          <h2>Available libs</h2>
          ${versionsTable()}
        </section>
        <section class="page-section">
          <h2>Examples</h2>
          <p>Importing from jslib.k6.io</p>
          ${codeExample("imports.js")}
          <p>Full script showcase</p>
          ${codeExample("full-script.js")}
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
  `;

  return markup;
}

module.exports = { renderToString };
