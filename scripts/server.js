const http = require('http')
const fs = require('fs')

const hostname = '127.0.0.1'
const port = 3000

process.once('SIGUSR2', function () {
  process.kill(process.pid, 'SIGUSR2')
})

fs.readFile('./lib/index.html', function (err, html) {
  if (err) {
    throw err
  }

  const server = http
    .createServer(function (request, response) {
      response.writeHeader(200, { 'Content-Type': 'text/html' })
      response.write(html)
      response.end()
    })
    .listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`)
    })
})
