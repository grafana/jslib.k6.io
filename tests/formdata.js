var http = require('k6/http')
var check = require('k6').check
var FormData = require('../lib/formdata/0.0.2/index.js').FormData

var logo = open('./data/logo.png', 'b')

// This test uses quickpizza.grafana.com/api/post which echoes back the posted multipart
// form data. The test validates that the FormData library correctly creates multipart
// requests by checking that form fields and files are present in the echoed response.
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
  var res = http.post('https://quickpizza.grafana.com/api/post', fd.body(), {
    headers: { 'Content-Type': 'multipart/form-data; boundary=' + fd.boundary },
  })
  var checks = {
    'got 200 response': function (res) {
      return res.status === 200
    },
    'form fields were submitted correctly': function (res) {
      var body = res.body
      // Check that the multipart response contains our form fields
      return body.includes('name="textField"') &&
             body.includes('world') &&
             body.includes('name="anotherField"') &&
             body.includes('!')
    },
    'files were uploaded correctly': function (res) {
      var body = res.body
      // Check that file uploads are present in the multipart response
      return body.includes('name="binArray"') &&
             body.includes('filename="logo.png"') &&
             body.includes('name="ArrayBuffer"') &&
             body.includes('name="text"') &&
             body.includes('filename="hello.txt"') &&
             body.includes('hello')  // content of text file
    },
  }
  check(res, checks)
}
