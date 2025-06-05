import pyroscope from '../lib/http-instrumentation-pyroscope/1.0.2/index.js'
import { check } from 'k6'

function validateBaggageHeader(headers) {
    if (check(headers, { 'has baggage header': (headers) => headers['Baggage'] != null })) {
        check(headers, {
            'baggage header contains test run id': (headers) => String(headers['Baggage']).includes('k6.test_run_id'),
            'baggage header contains scenario': (headers) => String(headers['Baggage']).includes('k6.scenario'),
            'baggage header contains name': (headers) => String(headers['Baggage']).includes('k6.name'),
        })
    }
}

function testPyroscopeNoBody() {
    const client = new pyroscope.Client()
    const res = client.request('GET', 'https://quickpizza.grafana.com/api/doughs')
    validateBaggageHeader(res.request.headers)
}

function testPyroscopeWithBody() {
    const client = new pyroscope.Client()
    const res = client.request('GET', 'https://quickpizza.grafana.com/api/doughs', 'hello')
    validateBaggageHeader(res.request.headers)
}

function testPyroscopeRequestWithParams() {
    const client = new pyroscope.Client()
    const res = client.request(
        'GET',
        'https://quickpizza.grafana.com/api/doughs',
        null,
        {
            headers: {
                baggage: 'foo=bar',
                'X-Test': 'test',
            },
            cookies: { 'X-Test': { value: 'test', replace: true } },
        },
    )

    check(res.request, {
        'contains cookies': (req) => String(req.headers['Cookie']) === 'X-Test=test',
        'contains original headers': (req) => String(req.headers['X-Test']) === 'test',
        'baggage header has original value': (req) => String(req.headers['Baggage']).includes('foo=bar'),
    })

    validateBaggageHeader(res.request.headers)
}

export {
  testPyroscopeNoBody,
  testPyroscopeWithBody,
  testPyroscopeRequestWithParams,
}

