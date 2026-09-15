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
// failure. So by default (failOnExpired: true), an expired/unavailable
// certificate also calls k6's fail(), which throws to actually mark the
// probe down.
//
// A merely near-expiry certificate stays a check()-only warning by default
// (failOnNearExpiry: false): with the default 30-day warnDays window,
// failing here would report the probe as down for a month before anything
// is actually broken, burying real outages under expiry noise. Alert on
// `probe_check_success_rate{check="sm-sslcheck: certificate is not near
// expiry"}` at a lower severity instead; pass failOnNearExpiry: true only
// if you want it to hard-fail anyway (e.g. as a CI gate rather than an
// uptime check).
export function evaluateCertificate(details, options = {}) {
  const { warnDays = 30, failOnExpired = true, failOnNearExpiry = false } = options
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
