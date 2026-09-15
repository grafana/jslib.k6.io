import { check, fail } from 'k6'
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
//
// check() failures alone don't fail a Synthetic Monitoring probe -- SM has
// no thresholds, and only treats an unhandled exception as an uptime
// failure. So by default, both an expired/unavailable certificate
// (failOnExpired) and a near-expiry one (failOnNearExpiry) call k6's
// fail(), which throws to actually mark the probe down.
//
// Near-expiry fails too, on purpose: the whole point of `warnDays` is to
// get someone paged before the certificate actually breaks anything. If
// that state didn't fail the probe, most people would never notice it --
// SM's default alerting is built on probe_success/uptime, and hardly
// anyone goes and builds a separate PromQL alert on
// `probe_check_success_rate{check="..."}` just to catch a warning. Pass
// failOnNearExpiry: false if you'd rather keep it a check()-only signal
// (e.g. because you *have* wired up that separate alert, at lower
// severity than the expired one).
export function evaluateCertificate(details, options = {}) {
  const { warnDays = 30, failOnExpired = true, failOnNearExpiry = true } = options
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

  if (expired && failOnExpired) {
    fail(
      available
        ? `sm-sslcheck: certificate for ${subject} expired ${-daysLeft} day(s) ago`
        : 'sm-sslcheck: no certificate details were available'
    )
  } else if (nearExpiry && failOnNearExpiry) {
    fail(`sm-sslcheck: certificate for ${subject} expires in ${daysLeft} day(s)`)
  }

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
