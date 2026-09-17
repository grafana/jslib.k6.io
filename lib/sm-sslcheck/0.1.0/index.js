import { check, fail } from 'k6'
import { Counter } from 'k6/metrics'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const certsExpired = new Counter('sm_sslcheck_expired')
const certsNearExpiry = new Counter('sm_sslcheck_near_expiry')

// `details.validTo` is a Unix timestamp in seconds. Negative once expired.
export function daysUntilExpiry(details) {
  return Math.floor((details.validTo * 1000 - Date.now()) / MS_PER_DAY)
}

// Missing details (details is null) fail closed as "expired".
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

// Check names are static (not interpolated with warnDays) so
// probe_check_success_rate stays queryable by name across checks.
// SM check() failures don't fail the probe on their own -- only fail()
// (an unhandled exception) does -- so failOnExpired/failOnNearExpiry
// default to true; set failOnNearExpiry: false to keep it a warning.
export function evaluateCertificate(details, options = {}) {
  options = options ?? {}
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

// `response` is an already-navigated k6/browser Response, e.g. from page.goto().
export async function checkCertificate(response, options = {}) {
  const details = await response.securityDetails()
  return evaluateCertificate(details, options)
}

export default { daysUntilExpiry, evaluateCertificate, checkCertificate }
