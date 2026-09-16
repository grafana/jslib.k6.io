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

// Classifies an already-resolved SecurityDetails object (or null, when the
// response carried no certificate) into the shape evaluateCertificate
// works with. Missing details fail closed as "expired" rather than as a
// separate, harder-to-reason-about state.
function classify(details, warnDays) {
  const available = details != null
  if (!available) {
    return { available, subject: '', issuer: null, validTo: null, daysLeft: null, expired: true, nearExpiry: false }
  }

  const daysLeft = daysUntilExpiry(details)
  const expired = daysLeft < 0

  return {
    available,
    subject: details.subjectName,
    issuer: details.issuer,
    validTo: details.validTo,
    daysLeft,
    expired,
    nearExpiry: !expired && daysLeft <= warnDays,
  }
}

// Checks the expiration window of an already-resolved SecurityDetails
// object (or null, when the response carried no certificate). Check names
// are static regardless of `warnDays` so that `probe_check_success_rate`
// stays queryable by the same name across differently-configured checks,
// and are emitted on every call so their pass rate never has silent gaps.
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
  const result = classify(details, warnDays)
  const { available, subject, expired, nearExpiry, daysLeft } = result

  check(null, {
    'sm-sslcheck: certificate details are available': () => available,
    'sm-sslcheck: certificate is not expired': () => !expired,
    'sm-sslcheck: certificate is not near expiry': () => !nearExpiry,
  })

  if (expired) {
    certsExpired.add(1, { subject })
    if (failOnExpired) {
      fail(
        available
          ? `sm-sslcheck: certificate for ${subject} expired ${-daysLeft} day(s) ago`
          : 'sm-sslcheck: no certificate details were available'
      )
    }
  } else if (nearExpiry) {
    certsNearExpiry.add(1, { subject })
    if (failOnNearExpiry) {
      fail(`sm-sslcheck: certificate for ${subject} expires in ${daysLeft} day(s)`)
    }
  }

  return result
}

// Extracts and checks the TLS certificate presented for `response` (an
// already-navigated k6/browser Response, e.g. the result of `page.goto()`).
export async function checkCertificate(response, options = {}) {
  const details = await response.securityDetails()
  return evaluateCertificate(details, options)
}

export default { daysUntilExpiry, evaluateCertificate, checkCertificate }
