import tempo from '../lib/http-instrumentation-tempo/1.0.1/index.js'
import { check } from 'k6'

function testTempoW3CPropagator() {
    const client = new tempo.Client({
        propagator: 'w3c',
    })

    const res = client.request('GET', 'https://httpbin.test.k6.io/anything')
    const req = JSON.parse(res.body)

    if (check(req, { 'contains traceparent header': (req) => req.headers['Traceparent'] != null })) {
        check(req, {
            'traceparent header is valid': (req) => req.headers['Traceparent'].match(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[01]{2}$/),
        })
    }
}

function testTempoJaegerPropagator() {
    const client = new tempo.Client({
        propagator: 'jaeger',
    })

    const res = client.request('GET', 'https://httpbin.test.k6.io/anything')
    const req = JSON.parse(res.body)

    if (check(req, { 'contains uber-trace-id header': (req) => req.headers['Uber-Trace-Id'] != null })) {
        console.log(req.headers['Uber-Trace-Id'])
        check(req, {
            'uber-trace-id header is valid': (req) => req.headers['Uber-Trace-Id'].match(/^[0-9a-f]{32}:[0-9a-f]{8}:0:[01]$/),
        })
    }
}

export {
    testTempoW3CPropagator,
    testTempoJaegerPropagator,
}
