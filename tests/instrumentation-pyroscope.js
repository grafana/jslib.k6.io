import pyroscope from '../lib/http-instrumentation-pyroscope/1.0.2/index.js'
import { check } from 'k6'

function validateBaggageHeader(headers) {
    if (check(headers, { 'has baggage header': (headers) => headers['Baggage'] != null })) {
        check(headers, {
            'baggage header contains test run id': (headers) => headers['Baggage'].includes('k6.test_run_id'),
            'baggage header contains scenario': (headers) => headers['Baggage'].includes('k6.scenario'),
            'baggage header contains name': (headers) => headers['Baggage'].includes('k6.name'),
        })
    }
}

function testPyroscopeNoBody() {
    const client = new pyroscope.Client()
    const res = client.request('GET', 'https://httpbin.test.k6.io/anything')
    const req = JSON.parse(res.body)

    validateBaggageHeader(req.headers)
}

function testPyroscopeWithBody() {
    const client = new pyroscope.Client()
    const res = client.request('GET', 'https://httpbin.test.k6.io/anything', 'hello')
    const req = JSON.parse(res.body)

    validateBaggageHeader(req.headers)
}

function testPyroscopeRequestWithParams() {
    const client = new pyroscope.Client()
    const res = client.request(
        'GET',
        'https://httpbin.test.k6.io/anything',
        null,
        {
            headers: {
                baggage: 'foo=bar',
                'X-Test': 'test',
            },
            cookies: { 'X-Test': { value: 'test', replace: true } },
        },
    )
    const req = JSON.parse(res.body)

    check(req, {
        'contains cookies': (req) => req.headers['Cookie'] === 'X-Test=test',
        'contains original headers': (req) => req.headers['X-Test'] === 'test',
        'baggage header has original value': (req) => req.headers['Baggage'].includes('foo=bar'),
    })

    validateBaggageHeader(req.headers)
}

export {
  testPyroscopeNoBody,
  testPyroscopeWithBody,
  testPyroscopeRequestWithParams,
}

