import { check, fail } from 'k6'
import { Counter } from 'k6/metrics'

const MS_PER_DAY = 24 * 60 * 60 * 1000

const certsExpired = new Counter('sm_sslcheck_expired')
const certsNearExpiry = new Counter('sm_sslcheck_near_expiry')
const certsUnavailable = new Counter('sm_sslcheck_unavailable')

// `details.validTo` is a Unix timestamp in seconds. Negative once expired.
export function daysUntilExpiry(details) {
  return Math.floor((details.validTo * 1000 - Date.now()) / MS_PER_DAY)
}

// Missing details (details is null) are their own state, distinct from
// "expired": we don't know the cert is bad, only that we have no data.
function classify(details, warnDays) {
  const available = details != null
  if (!available) {
    return { available, subject: '', issuer: null, validTo: null, daysLeft: null, expired: false, nearExpiry: false }
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
// failOnExpired/failOnNearExpiry default to false: fail() throws, and a
// library shouldn't surprise callers with that by default -- turn it on
// explicitly in the check that actually wants to page on this.
export function evaluateCertificate(details, options = {}) {
  options = options ?? {}
  const { warnDays = 30, failOnExpired = false, failOnNearExpiry = false } = options
  const result = classify(details, warnDays)
  const { available, subject, expired, nearExpiry, daysLeft } = result

  check(null, {
    'sm-sslcheck: certificate details are available': () => available,
    'sm-sslcheck: certificate is not expired': () => available && !expired,
    'sm-sslcheck: certificate is not near expiry': () => available && !nearExpiry,
  })

  if (!available) {
    certsUnavailable.add(1)
    if (failOnExpired) {
      fail('sm-sslcheck: no certificate details were available')
    }
  } else if (expired) {
    certsExpired.add(1, { subject })
    if (failOnExpired) {
      fail(`sm-sslcheck: certificate for ${subject} expired ${-daysLeft} day(s) ago`)
    }
  } else if (nearExpiry) {
    certsNearExpiry.add(1, { subject })
    if (failOnNearExpiry) {
      fail(`sm-sslcheck: certificate for ${subject} expires in ${daysLeft} day(s)`)
    }
  }

  return result
}

// `response` is an already-navigated k6/browser Response, e.g. from
// page.goto() -- which can itself resolve to null (e.g. a download).
export async function checkCertificate(response, options = {}) {
  const details = response == null ? null : await response.securityDetails()
  return evaluateCertificate(details, options)
}

export default { daysUntilExpiry, evaluateCertificate, checkCertificate }
