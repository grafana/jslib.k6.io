const fs = require('fs')
const supported = require('../supported.json')
const pkgName = process.argv.slice(-1)[0]

if (!supported.hasOwnProperty(pkgName)) {
  const updated = {
    ...supported,
    [pkgName]: [],
  }

  fs.writeFileSync('./supported.json', JSON.stringify(updated, null, 2))
}
