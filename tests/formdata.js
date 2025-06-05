var http = require('k6/http')
var check = require('k6').check
var FormData = require('../lib/formdata/0.0.2/index.js').FormData

var logo = open('./data/logo.png', 'b')

// TODO: httpbin.test.k6.io has been shutdown so the test has been migrated to httpbin.org
// to fix the immediate issue and unblock the development.
// However, it requires to be migrated to quickpizza.grafana.com to be stable on the long-term,
// because httpbin.org isn't reliable enough for our use case.
exports.testPost = function () {
  var fd = new FormData()
  fd.append('binArray', http.file(logo, 'logo.png', 'image/png'))
  fd.append('ArrayBuffer', {
    data: new Uint8Array(logo).buffer,
    filename: 'logo.png',
    content_type: 'image/png',
  })
  fd.append('text', http.file('hello', 'hello.txt', 'text/plain'))
  fd.append('textField', 'world')
  fd.append('anotherField', '!')
  var res = http.post('https://httpbin.org/post', fd.body(), {
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + fd.boundary },
  })
  var checks = {
    'got 200 response': function (res) {
      return res.status === 200
    },
    'form fields were submitted correctly': function (res) {
      var form = res.json()['form']
      return form.textField == 'world' && form.anotherField == '!'
    },
    'files were uploaded correctly': function (res) {
      var files = res.json()['files']
      return (
        Object.keys(files).length === 3 &&
        files['binArray'] &&
        files['binArray'].includes('image/png') &&
        files['ArrayBuffer'] &&
        files['ArrayBuffer'].includes('image/png') &&
        files['binArray'] == files['ArrayBuffer'] &&
        files['text'] == 'hello'
      )
    },
  }
  check(res, checks)
}
