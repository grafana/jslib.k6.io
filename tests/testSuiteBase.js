var Rate = require('k6/metrics').Rate

var testCasesOK = new Rate('test_case_ok')

var testCases = [
  require('./summary.js').testHumanizeValue,
  require('./summary.js').testTextSummary,
  require('./formdata.js').testPost,
]

exports.options = {
  vus: 1,
  iterations: testCases.length,
  thresholds: {
    checks: ['rate==1.0'],
    test_case_ok: ['rate==1.0'],
  },
}

exports.default = function () {
  try {
    testCases[__ITER]()
    testCasesOK.add(true)
  } catch (e) {
    testCasesOK.add(false)
    throw e
  }
}
