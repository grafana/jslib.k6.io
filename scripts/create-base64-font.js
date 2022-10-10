const fs = require('fs')
const path = require('path')
const fontDirectory = path.resolve(__dirname, '../static/fonts')

const supportedFormats = [
  { extension: 'eot', name: 'embedded-opentype' },
  { extension: 'woff2', name: 'woff2' },
  { extension: 'woff', name: 'woff' },
  { extension: 'ttf', name: 'truetype' },
]

function getBase64FontSrc(filename, format) {
  if (!format) {
    throw new Error('Format was not specified')
  }
  if (!fs.existsSync(filename)) {
    throw new Error(`Font filename does not exist (${filename})`)
  }

  const encodedFont = fs.readFileSync(filename, { encoding: 'base64' })

  return `url(data:font/${format};charset=utf-8;base64,${encodedFont}) format('${format}')`
}

/**
 *
 * @param {string} filename
 * @returns {string}
 */
function createBase64Font(filename) {
  const bulk = []
  supportedFormats.forEach((formatOptions) => {
    const formatFilename = `${fontDirectory}/${filename}.${formatOptions.extension}`
    if (fs.existsSync(formatFilename)) {
      bulk.push([formatFilename, formatOptions.name])
    }
  })

  return bulk.map(([fontFilename, format]) => getBase64FontSrc(fontFilename, format)).join(',\n')
}

module.exports = createBase64Font
