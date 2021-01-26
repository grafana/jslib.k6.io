var http = require('k6/http');
var check = require('k6').check
var FormData = require('../lib/formdata/0.0.1/index.js').FormData;

var logo1 = open('./data/logo.png', 'b');

exports.testPost = function() {
  var fd = new FormData();
  fd.append('binArray', logo1, 'logo1.png');
  fd.append('ArrayBuffer', new Uint8Array(logo1).buffer, 'logo1.png');
  fd.append('text', 'hello', 'hello.txt');
  var res = http.post('https://httpbin.test.k6.io/post', fd.body(),
                      { headers: { 'Content-Type': 'multipart/form-data; boundary=' + fd.boundary }});
  var checks = {
    'got 200 response': function (res) { return res.status === 200 },
    'files were uploaded correctly': function (res) {
      var files = res.json()['files'];
      return (Object.keys(files).length === 3 &&
              (files['binArray'] && files['binArray'].includes('application/octet-stream')) &&
              (files['ArrayBuffer'] && files['ArrayBuffer'].includes('application/octet-stream')) &&
              (files['binArray'] == files['ArrayBuffer']) &&
              (files['text'] == 'hello'));
    },
  }
  check(res, checks)
}
