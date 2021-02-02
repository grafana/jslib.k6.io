var http = require('k6/http');
var check = require('k6').check
var FormData = require('../lib/formdata/0.0.1/index.js').FormData;

var logo = open('./data/logo.png', 'b');

exports.testPost = function() {
  var fd = new FormData();
  fd.append('binArray', http.file(logo, 'logo.png', 'image/png'));
  fd.append('ArrayBuffer', { data:new Uint8Array(logo).buffer, filename: 'logo.png', content_type: 'image/png' });
  fd.append('text', http.file('hello', 'hello.txt', 'text/plain'));
  var res = http.post('https://httpbin.test.k6.io/post', fd.body(),
                      { headers: { 'Content-Type': 'multipart/form-data; boundary=' + fd.boundary }});
  var checks = {
    'got 200 response': function (res) { return res.status === 200 },
    'files were uploaded correctly': function (res) {
      var files = res.json()['files'];
      return (Object.keys(files).length === 3 &&
              (files['binArray'] && files['binArray'].includes('image/png')) &&
              (files['ArrayBuffer'] && files['ArrayBuffer'].includes('image/png')) &&
              (files['binArray'] == files['ArrayBuffer']) &&
              (files['text'] == 'hello'));
    },
  }
  check(res, checks)
}
