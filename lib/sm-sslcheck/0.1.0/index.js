import { check } from 'k6'
import { Counter } from 'k6/metrics'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const certsExpired = new Counter('sm_sslcheck_expired')
const certsNearExpiry = new Counter('sm_sslcheck_near_expiry')

// Returns the number of whole days left before `details.validTo` (a Unix
// timestamp in seconds, as returned by k6/browser's Response.securityDetails())
// is reached. Negative once the certificate has expired.
export function daysUntilExpiry(details) {
  return Math.floor((details.validTo * 1000 - Date.now()) / MS_PER_DAY)
}

// Checks the expiration window of an already-resolved SecurityDetails
// object (or null, when the response carried no certificate). Check names
// are static regardless of `warnDays` so that `probe_check_success_rate`
// stays queryable by the same name across differently-configured checks.
//
// Missing details fail closed: with no certificate to inspect, this reports
// "expired" rather than skipping the check, so the three check names below
// are emitted on every call and their pass rate never has silent gaps.
export function evaluateCertificate(details, options = {}) {
  const { warnDays = 30 } = options
  const available = details != null

  const daysLeft = available ? daysUntilExpiry(details) : null
  const expired = !available || daysLeft < 0
  const nearExpiry = !expired && daysLeft <= warnDays
  const subject = available ? details.subjectName : ''

  if (expired) {
    certsExpired.add(1, { subject })
  } else if (nearExpiry) {
    certsNearExpiry.add(1, { subject })
  }

  check(null, {
    'sm-sslcheck: certificate details are available': () => available,
    'sm-sslcheck: certificate is not expired': () => !expired,
    'sm-sslcheck: certificate is not near expiry': () => !nearExpiry,
  })

  return {
    available,
    subject: available ? details.subjectName : null,
    issuer: available ? details.issuer : null,
    validTo: available ? details.validTo : null,
    daysLeft,
    expired,
    nearExpiry,
  }
}

// Extracts and checks the TLS certificate presented for `response` (an
// already-navigated k6/browser Response, e.g. the result of `page.goto()`).
export async function checkCertificate(response, options = {}) {
  const details = await response.securityDetails()
  return evaluateCertificate(details, options)
}

export default { daysUntilExpiry, evaluateCertificate, checkCertificate }
