var check = require('k6').check

var summary = require('../lib/k6-summary/0.1.0/index.js')

function D(nanosecondDuration) {
  return nanosecondDuration / 1000000.0 // in msec
}

var humanizeValueTestCases = [
  {
    type: 'counter',
    contains: 'default',
    tests: [
      { value: 1.0, expResults: ['1', '1', '1', '1'] },
      { value: 1.5, expResults: ['1.5', '1.5', '1.5', '1.5'] },
      { value: 1.54321, expResults: ['1.54321', '1.54321', '1.54321', '1.54321'] },
    ],
  },
  {
    type: 'gauge',
    contains: 'default',
    tests: [
      { value: 1.0, expResults: ['1', '1', '1', '1'] },
      { value: 1.5, expResults: ['1.5', '1.5', '1.5', '1.5'] },
      { value: 1.54321, expResults: ['1.54321', '1.54321', '1.54321', '1.54321'] },
    ],
  },
  {
    type: 'trend',
    contains: 'default',
    tests: [
      { value: 1.0, expResults: ['1', '1', '1', '1'] },
      { value: 1.5, expResults: ['1.5', '1.5', '1.5', '1.5'] },
      { value: 1.54321, expResults: ['1.54321', '1.54321', '1.54321', '1.54321'] },
    ],
  },
  {
    type: 'counter',
    contains: 'time',
    tests: [
      { value: D(1), expResults: ['1ns', '0.00s', '0.00ms', '0.00µs'] },
      { value: D(12), expResults: ['12ns', '0.00s', '0.00ms', '0.01µs'] },
      { value: D(123), expResults: ['123ns', '0.00s', '0.00ms', '0.12µs'] },
      { value: D(1234), expResults: ['1.23µs', '0.00s', '0.00ms', '1.23µs'] },
      { value: D(12345), expResults: ['12.34µs', '0.00s', '0.01ms', '12.35µs'] },
      { value: D(123456), expResults: ['123.45µs', '0.00s', '0.12ms', '123.46µs'] },
      { value: D(1234567), expResults: ['1.23ms', '0.00s', '1.23ms', '1234.57µs'] },
      { value: D(12345678), expResults: ['12.34ms', '0.01s', '12.35ms', '12345.68µs'] },
      { value: D(123456789), expResults: ['123.45ms', '0.12s', '123.46ms', '123456.79µs'] },
      { value: D(1234567890), expResults: ['1.23s', '1.23s', '1234.57ms', '1234567.89µs'] },
      { value: D(12345678901), expResults: ['12.34s', '12.35s', '12345.68ms', '12345678.90µs'] },
      { value: D(123456789012), expResults: ['2m3s', '123.46s', '123456.79ms', '123456789.01µs'] },
      {
        value: D(1234567890123),
        expResults: ['20m34s', '1234.57s', '1234567.89ms', '1234567890.12µs'],
      },
      {
        value: D(12345678901234),
        expResults: ['3h25m45s', '12345.68s', '12345678.90ms', '12345678901.23µs'],
      },
      {
        value: D(123456789012345),
        expResults: ['34h17m36s', '123456.79s', '123456789.01ms', '123456789012.35µs'],
      },
    ],
  },
  {
    type: 'gauge',
    contains: 'time',
    tests: [
      { value: D(1), expResults: ['1ns', '0.00s', '0.00ms', '0.00µs'] },
      { value: D(12), expResults: ['12ns', '0.00s', '0.00ms', '0.01µs'] },
      { value: D(123), expResults: ['123ns', '0.00s', '0.00ms', '0.12µs'] },
      { value: D(1234), expResults: ['1.23µs', '0.00s', '0.00ms', '1.23µs'] },
      { value: D(12345), expResults: ['12.34µs', '0.00s', '0.01ms', '12.35µs'] },
      { value: D(123456), expResults: ['123.45µs', '0.00s', '0.12ms', '123.46µs'] },
      { value: D(1234567), expResults: ['1.23ms', '0.00s', '1.23ms', '1234.57µs'] },
      { value: D(12345678), expResults: ['12.34ms', '0.01s', '12.35ms', '12345.68µs'] },
      { value: D(123456789), expResults: ['123.45ms', '0.12s', '123.46ms', '123456.79µs'] },
      { value: D(1234567890), expResults: ['1.23s', '1.23s', '1234.57ms', '1234567.89µs'] },
      { value: D(12345678901), expResults: ['12.34s', '12.35s', '12345.68ms', '12345678.90µs'] },
      { value: D(123456789012), expResults: ['2m3s', '123.46s', '123456.79ms', '123456789.01µs'] },
      {
        value: D(1234567890123),
        expResults: ['20m34s', '1234.57s', '1234567.89ms', '1234567890.12µs'],
      },
      {
        value: D(12345678901234),
        expResults: ['3h25m45s', '12345.68s', '12345678.90ms', '12345678901.23µs'],
      },
      {
        value: D(123456789012345),
        expResults: ['34h17m36s', '123456.79s', '123456789.01ms', '123456789012.35µs'],
      },
    ],
  },
  {
    type: 'trend',
    contains: 'time',
    tests: [
      { value: D(1), expResults: ['1ns', '0.00s', '0.00ms', '0.00µs'] },
      { value: D(12), expResults: ['12ns', '0.00s', '0.00ms', '0.01µs'] },
      { value: D(123), expResults: ['123ns', '0.00s', '0.00ms', '0.12µs'] },
      { value: D(1234), expResults: ['1.23µs', '0.00s', '0.00ms', '1.23µs'] },
      { value: D(12345), expResults: ['12.34µs', '0.00s', '0.01ms', '12.35µs'] },
      { value: D(123456), expResults: ['123.45µs', '0.00s', '0.12ms', '123.46µs'] },
      { value: D(1234567), expResults: ['1.23ms', '0.00s', '1.23ms', '1234.57µs'] },
      { value: D(12345678), expResults: ['12.34ms', '0.01s', '12.35ms', '12345.68µs'] },
      { value: D(123456789), expResults: ['123.45ms', '0.12s', '123.46ms', '123456.79µs'] },
      { value: D(1234567890), expResults: ['1.23s', '1.23s', '1234.57ms', '1234567.89µs'] },
      { value: D(12345678901), expResults: ['12.34s', '12.35s', '12345.68ms', '12345678.90µs'] },
      { value: D(123456789012), expResults: ['2m3s', '123.46s', '123456.79ms', '123456789.01µs'] },
      {
        value: D(1234567890123),
        expResults: ['20m34s', '1234.57s', '1234567.89ms', '1234567890.12µs'],
      },
      {
        value: D(12345678901234),
        expResults: ['3h25m45s', '12345.68s', '12345678.90ms', '12345678901.23µs'],
      },
      {
        value: D(123456789012345),
        expResults: ['34h17m36s', '123456.79s', '123456789.01ms', '123456789012.35µs'],
      },
    ],
  },
  {
    type: 'rate',
    contains: 'default',
    tests: [
      { value: 0.0, expResults: ['0.00%', '0.00%', '0.00%', '0.00%'] },
      { value: 0.01, expResults: ['1.00%', '1.00%', '1.00%', '1.00%'] },
      { value: 0.02, expResults: ['2.00%', '2.00%', '2.00%', '2.00%'] },
      { value: 0.022, expResults: ['2.19%', '2.19%', '2.19%', '2.19%'] }, // caused by float truncation
      { value: 0.0222, expResults: ['2.22%', '2.22%', '2.22%', '2.22%'] },
      { value: 0.02222, expResults: ['2.22%', '2.22%', '2.22%', '2.22%'] },
      { value: 0.022222, expResults: ['2.22%', '2.22%', '2.22%', '2.22%'] },
      { value: 1.0 / 3.0, expResults: ['33.33%', '33.33%', '33.33%', '33.33%'] },
      { value: 0.5, expResults: ['50.00%', '50.00%', '50.00%', '50.00%'] },
      { value: 0.55, expResults: ['55.00%', '55.00%', '55.00%', '55.00%'] },
      { value: 0.555, expResults: ['55.50%', '55.50%', '55.50%', '55.50%'] },
      { value: 0.5555, expResults: ['55.55%', '55.55%', '55.55%', '55.55%'] },
      { value: 0.55555, expResults: ['55.55%', '55.55%', '55.55%', '55.55%'] },
      { value: 0.75, expResults: ['75.00%', '75.00%', '75.00%', '75.00%'] },
      { value: 0.999995, expResults: ['99.99%', '99.99%', '99.99%', '99.99%'] },
      { value: 1.0, expResults: ['100.00%', '100.00%', '100.00%', '100.00%'] },
      { value: 1.5, expResults: ['150.00%', '150.00%', '150.00%', '150.00%'] },
    ],
  },
  {
    type: 'counter',
    contains: 'data',
    tests: [
      { value: 1, expResults: new Array(4).fill('1 B') },
      { value: 12, expResults: new Array(4).fill('12 B') },
      { value: 123, expResults: new Array(4).fill('123 B') },
      { value: 1234, expResults: new Array(4).fill('1.2 kB') },
      { value: 12345, expResults: new Array(4).fill('12 kB') },
      { value: 123456, expResults: new Array(4).fill('124 kB') },
      { value: 1234567, expResults: new Array(4).fill('1.2 MB') },
      { value: 12345678, expResults: new Array(4).fill('12 MB') },
      { value: 123456789, expResults: new Array(4).fill('124 MB') },
      { value: 1234567890, expResults: new Array(4).fill('1.2 GB') },
      { value: 12345678901, expResults: new Array(4).fill('12 GB') },
      { value: 123456789012, expResults: new Array(4).fill('124 GB') },
      { value: 1234567890123, expResults: new Array(4).fill('1.2 TB') },
      { value: 12345678901234, expResults: new Array(4).fill('12 TB') },
      { value: 123456789012345, expResults: new Array(4).fill('124 TB') },
      { value: 1234567890123456, expResults: new Array(4).fill('1.2 PB') },
      { value: 12345678901234567, expResults: new Array(4).fill('12 PB') },
    ],
  },
]

var timeUnits = ['', 's', 'ms', 'us']

function runHumanizeValueTestCase(metric, value, expResults) {
  for (var i = 0; i < timeUnits.length; i++) {
    var result = summary.humanizeValue(value, metric, timeUnits[i])
    var checks = {
      'humanized value is equal to expected': function (res) {
        return res === expResults[i]
      },
    }
    if (!check(result, checks)) {
      console.error(
        'Expected humanizeValue(' +
          metric.type +
          ', ' +
          metric.contains +
          ', "' +
          timeUnits[i] +
          '", ' +
          value +
          ') to be "' +
          expResults[i] +
          '" but it was "' +
          result +
          '"'
      )
    }
  }
}

exports.testHumanizeValue = function () {
  for (var tc = 0; tc < humanizeValueTestCases.length; tc++) {
    var testCase = humanizeValueTestCases[tc]
    var metric = { type: testCase.type, contains: testCase.contains }
    for (var i = 0; i < testCase.tests.length; i++) {
      runHumanizeValueTestCase(metric, testCase.tests[i].value, testCase.tests[i].expResults)
    }
  }
}

var rawData = JSON.parse(open('./data/summary/raw-data.json'))
var expTextColorOutput = open('./data/summary/exp-text-color.txt')
var textColorOldk6Output = open('./data/summary/text-color-old-from-k6.txt')

exports.testTextSummary = function () {
  var resultColor = summary.textSummary(rawData, { indent: ' ', enableColors: true })
  var resultNoColor = summary.textSummary(rawData, { indent: ' ', enableColors: false })
  check(null, {
    'color text result matches expected': function () {
      return expTextColorOutput === resultColor
    },
    'nocolor text result matches expected': function () {
      return expTextColorOutput.replace(/\x1b\[[\d;]+m/g, '') === resultNoColor
    },
    'nocolor text result matches old k6 nocolor': function () {
      return textColorOldk6Output.replace(/\u001b\[[\d;]*m/g, '') === resultNoColor
    },
  })
}

//TODO: add some JUnit tests
