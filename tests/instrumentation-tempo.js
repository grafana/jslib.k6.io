import tempo from '../lib/http-instrumentation-tempo/1.0.1/index.js'
import { check } from 'k6'

function testTempoW3CPropagator() {
    const client = new tempo.Client({
        propagator: 'w3c',
    })

    const res = client.request('GET', 'https://quickpizza.grafana.com/api/doughs')

    if (check(res.request, { 'contains traceparent header': (req) => req.headers['Traceparent'] != null })) {
        check(res.request, {
            'traceparent header is valid': (req) => String(req.headers['Traceparent']).match(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[01]{2}$/),
        })
    }
}

function testTempoJaegerPropagator() {
    const client = new tempo.Client({
        propagator: 'jaeger',
    })

    const res = client.request('GET', 'https://quickpizza.grafana.com/api/doughs')

    if (check(res.request, { 'contains uber-trace-id header': (req) => res.request.headers['Uber-Trace-Id'] != null })) {
        check(res.request, {
            'uber-trace-id header is valid': (req) => String(req.headers['Uber-Trace-Id']).match(/^[0-9a-f]{32}:[0-9a-f]{8}:0:[01]$/),
        })
    }
}

export {
    testTempoW3CPropagator,
    testTempoJaegerPropagator,
}
