var testSummary = require('./summary.js').test;

exports.options = {
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
};

exports.default = function () {
  testSummary();
}
