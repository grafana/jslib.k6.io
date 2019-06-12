#!/usr/bin/env node
const fs = require("fs");

const DOMAIN = "https://jslib.k6.io";


const logo = `
<svg width="181px" height="170px" viewBox="0 0 181 170">
    <g id="Page-2" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="k6-logo-cyan" fill="#4AAED0">
            <path d="M162.9,153.5 C162.8,149 160.7,146.7 156.7,146.6 C152.7,146.7 150.6,149 150.6,153.5 L150.6,157.2 C150.7,161.8 152.7,164.1 156.7,164.1 C160.7,164.1 162.8,161.8 162.9,157.2 L162.9,153.5 Z" id="Path"></path>
            <path d="M168,135 L162.4,135 C161.4,132.5 159.5,131.3 156.7,131.2 C152.7,131.3 150.7,133.6 150.6,138.1 L150.6,142.3 C153.6,141.3 156.4,140.9 158.9,140.9 C161.8,140.9 164.2,141.9 166.2,143.9 C168.2,145.9 169.1,149.1 169.1,153.4 L169.1,157.5 C169,161.6 167.8,164.8 165.4,167.1 C164.3,168.1 163.1,168.9 161.8,169.5 L180.6,169.5 L168,135 Z" id="Path"></path>
            <polygon id="Path" points="122.6 160.9 122.6 169.5 135.4 169.5 127.5 155.2"></polygon>
            <path d="M144.3,157.6 L144.3,137.7 C144.3,133.5 145.6,130.3 148.2,128.1 C150.6,125.9 153.4,124.8 156.7,124.8 C159.7,124.8 162.3,125.7 164.6,127.4 C164.9,127.7 165.3,128 165.6,128.3 L119.2,0.5 L87.2,88.7 L67.4,55.2 L1.42108547e-14,169.5 L101,169.5 L116.3,169.5 L116.3,125.1 L122.5,125.1 L122.5,153.1 L122.6,153.1 L134.6,138.1 L142.1,138.1 L131.4,150.6 L143.2,169.5 L151.7,169.5 C150.4,168.9 149.2,168.2 148.1,167.1 C145.6,164.9 144.3,161.7 144.3,157.6 Z" id="Path"></path>
        </g>
    </g>
</svg>
`;

const createLink = (name, version, main) => {
  return `<a target="_blank" href="${DOMAIN}/${name}/${version}/${main}">${version}</a>`;
};

const versionsTable = () => {
  const supported = require('../supported.json');
  const trs = Object.entries(supported).map(([name, versionsMap]) => {
    const versionLinks = Object.keys(versionsMap).map(version => createLink(name, version, "index.js")).join(", ");
    return `<tr>
      <td>${name}</td>
      <td>${versionLinks}</td>
    </tr>`
  }).join("");

  return `
    <table class="table">
      ${trs}
    </table>
  `;
};

const codeExample = name => {
  const snippet = fs.readFileSync(`./static/examples/${name}`, 'utf-8');
  return `<pre><code class="code language-js">${snippet}</code></pre>`;
};

function main() {
  const markup = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="icon" href="https://jslib.k6.io/favicon.png" sizes="32x32">
    <title>jslib.k6.io - JS std lib</title>
    <style> ${fs.readFileSync('./static/styles.css', 'utf-8')}</style>
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
      </header>
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
              <a href="https://docs.k6.io/docs">K6 API docs</a>
            </p>
          </li>
        </ul>
      </section>
    </main>
    <script>
      ${fs.readFileSync('./static/prisms.js', 'utf-8')}
    </script>
  </body>
  </html>
  `;

  fs.writeFileSync('./lib/index.html', markup);
}

main();
