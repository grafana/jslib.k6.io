#!/usr/bin/env node
process.env.NODE_ENV === process.env.NODE_ENV || 'production'

const path = require('path')
const webpack = require('webpack')
const fs = require('fs')
const webpackConfig = require('../webpack.config')

function ask(question) {
  var rl = require('readline')
  var r = rl.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  })

  return new Promise((resolve, reject) => {
    r.question(question, (answer) => {
      resolve(answer)
      r.close()
    })
  })
}

async function main() {
  const pkgString = process.argv.slice(-1)[0]
  const [pkgName = '', pkgVersion = ''] = pkgString.split('@')

  const basePath = `lib/${pkgName}/${pkgVersion}`
  const entryPath = `${basePath}/index.src.js`

  if (!fs.existsSync(entryPath)) {
    console.error(`No "index.src.js" file located at ${basePath}`)
    process.exit(1)
  }

  if (fs.existsSync(`${basePath}/index.js`)) {
    const response = await ask(
      `There is already a index.js at ${basePath}, do you which to override? (y/n): `
    )
    if (response !== 'y') {
      console.log('Skipping...')
      process.exit()
    }
  }

  const compilerConfig = {
    ...webpackConfig,
    entry: path.resolve(entryPath),
    output: {
      ...webpackConfig.output,
      path: path.resolve(basePath),
    },
  }

  const response = await ask(`Does it require babel-js transpilation? (y/n): `)
  if (response === 'y') {
    compilerConfig.module = {
      rules: [
        {
          test: /\.(js)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
          },
        },
      ],
    }
  }

  const compiler = webpack(compilerConfig)

  console.log('Crunching...')
  compiler.run((err, stats) => {
    if (err || stats.hasErrors()) {
      console.log(err)
      process.exit(1)
    }

    console.log(`\nBundle generated at ${basePath}/index.js`)
    console.log(`> Don't forget to add the lib to supported.json and update index-template.js`)
  })
}

main()
