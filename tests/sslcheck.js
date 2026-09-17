import { check } from 'k6'
import {
  daysUntilExpiry,
  evaluateCertificate,
  checkCertificate,
} from '../lib/sm-sslcheck/0.1.0/index.js'

function fakeSecurityDetails(daysFromNow) {
  return {
    subjectName: 'example.com',
    issuer: 'Test CA',
    protocol: 'TLS 1.3',
    validTo: Math.floor(Date.now() / 1000) + daysFromNow * 24 * 60 * 60,
  }
}

export function SslcheckDaysUntilExpiry() {
  check(null, {
    'a future certificate reports a positive number of days left': () =>
      daysUntilExpiry(fakeSecurityDetails(10)) > 0,
    'an expired certificate reports a negative number of days left': () =>
      daysUntilExpiry(fakeSecurityDetails(-5)) < 0,
  })
}

export function SslcheckHealthyCertificate() {
  const result = evaluateCertificate(fakeSecurityDetails(90), { warnDays: 30 })

  check(result, {
    'a far-future certificate is reported as available': (r) => r.available === true,
    'a far-future certificate is not expired': (r) => r.expired === false,
    'a far-future certificate is not near expiry': (r) => r.nearExpiry === false,
    'the result carries the certificate subject': (r) => r.subject === 'example.com',
  })
}

export function SslcheckIsFunction() {
  check(null, {
    'checkCertificate is a function': () => typeof checkCertificate === 'function',
  })
}
