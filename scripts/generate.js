#!/usr/bin/env node

const path = require('path');
const supported = require('../supported.json');
const fs = require('fs');

function getPkgMeta(pkgName) {
  const packageJSON = require(`../node_modules/${pkgName}/package.json`);
  const { version, browser } = packageJSON;

  return {
    version,
    main: path.resolve(`../node_modules/${pkgName}/`, browser)
  }
}


function main() {
  const packages = Object.keys(supported);
  const result = {};
  const supportedUpdated = {...supported};

  packages.forEach(name => {
    const pkg = getPkgMeta(name);

    if (!supported[name].hasOwnProperty(pkg.version)) {
      result[name] = pkg;
    }
  });

  if (Object.keys(result).length > 0) {
    console.log("\n\nDo you want to add the following: ");
    console.table(result);

    Object.entries(result).forEach(([name, pkg]) => {
      const path = `lib/${name}/${pkg.version}`;
      fs.mkdirSync(path, { recursive: true });
      fs.copyFileSync(pkg.main, `${path}/index.js`);

      supportedUpdated[name][pkg.version] = {};
    });

    fs.writeFileSync("./supported.json", JSON.stringify(supportedUpdated, null, 2));
  }
}


main();
