import { Rate } from 'k6/metrics'
import { evaluateCertificate, checkCertificate, daysUntilExpiry } from '../lib/sm-sslcheck/0.1.0/index.js'

// This file is deliberately kept out of testSuite.js: it exercises paths
// where the library's own check() calls are SUPPOSED to fail (that's what
// we're testing), which would trip testSuite.js's `checks: rate==1.0`
// threshold. Assertions here use plain throws instead of check(), so they
// don't get mixed into that same "checks" metric.
//
// k6 has no JS-side way to read a Counter's current value back, so
// "certsExpired/certsNearExpiry incremented" is verified indirectly, via
// the branch that increments it having actually been taken (the returned
// result and the fail() error), not the metric itself.

function fakeDetails(daysFromNow) {
  return {
    subjectName: 'example.com',
    issuer: 'Test CA',
    protocol: 'TLS 1.3',
    validTo: Math.floor(Date.now() / 1000) + daysFromNow * 24 * 60 * 60,
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function expectThrow(fn, message) {
  try {
    await fn()
  } catch (e) {
    return e
  }
  throw new Error(`expected to throw: ${message}`)
}

async function expectNoThrow(fn, message) {
  try {
    return await fn()
  } catch (e) {
    throw new Error(`expected not to throw (${message}): ${e.message}`)
  }
}

// failOnExpired/failOnNearExpiry default to false (a library shouldn't
// throw by default -- see the PR), so "default options" is the
// non-throwing case here, and the explicit opt-in is what fails.

export async function ExpiredCertDefaultOptionsDoesNotThrow() {
  const result = await expectNoThrow(() => evaluateCertificate(fakeDetails(-1)), 'expired cert, default options')
  assert(result.available === true, 'result.available should still be true')
  assert(result.expired === true, 'result.expired should still be true')
}

export async function ExpiredCertFailOnExpiredTrueFails() {
  const err = await expectThrow(
    () => evaluateCertificate(fakeDetails(-1), { failOnExpired: true }),
    'expired cert, failOnExpired: true'
  )
  assert(err.message.includes('expired'), `error should mention expiry, got: ${err.message}`)
}

export async function NearExpiryDefaultOptionsDoesNotThrow() {
  const result = await expectNoThrow(
    () => evaluateCertificate(fakeDetails(10), { warnDays: 30 }),
    'near-expiry cert, default options'
  )
  assert(result.expired === false, 'result.expired should be false')
  assert(result.nearExpiry === true, 'result.nearExpiry should still be true')
}

export async function NearExpiryFailOnNearExpiryTrueFails() {
  const err = await expectThrow(
    () => evaluateCertificate(fakeDetails(10), { warnDays: 30, failOnNearExpiry: true }),
    'near-expiry cert, failOnNearExpiry: true'
  )
  assert(err.message.includes('expires in'), `error should mention days left, got: ${err.message}`)
}

export async function UnavailableDetailsDefaultOptionsDoesNotThrow() {
  const result = await expectNoThrow(() => evaluateCertificate(null), 'null details, default options')
  assert(result.available === false, 'result.available should be false')
  assert(result.expired === false, 'result.expired should be false -- unavailable is not the same as expired')
  assert(result.nearExpiry === false, 'result.nearExpiry should be false')
}

export async function UnavailableDetailsFailOnExpiredTrueFails() {
  const err = await expectThrow(
    () => evaluateCertificate(null, { failOnExpired: true }),
    'null details, failOnExpired: true'
  )
  assert(err.message.includes('no certificate details'), `error should mention missing details, got: ${err.message}`)
}

// A few seconds of margin on both boundary fixtures below keeps the
// assertion from flaking on how long the test itself takes to run.

export function BoundaryDaysLeftEqualsWarnDaysCountsAsNearExpiry() {
  const warnDays = 10
  const details = { subjectName: 'x', issuer: 'y', validTo: Math.floor(Date.now() / 1000) + warnDays * 86400 + 5 }

  const daysLeft = daysUntilExpiry(details)
  assert(daysLeft === warnDays, `expected daysLeft to be exactly ${warnDays}, got ${daysLeft}`)

  const result = evaluateCertificate(details, { warnDays, failOnNearExpiry: false })
  assert(result.expired === false, 'daysLeft === warnDays should not be expired')
  assert(result.nearExpiry === true, 'daysLeft === warnDays should count as near-expiry (uses <=)')
}

export function BoundaryDaysLeftZeroIsNotExpired() {
  const details = { subjectName: 'x', issuer: 'y', validTo: Math.floor(Date.now() / 1000) + 10 }

  const daysLeft = daysUntilExpiry(details)
  assert(daysLeft === 0, `expected daysLeft to be exactly 0, got ${daysLeft}`)

  const result = evaluateCertificate(details, { failOnNearExpiry: false })
  assert(result.expired === false, 'daysLeft === 0 should not be expired (uses < 0)')
  assert(result.nearExpiry === true, 'daysLeft === 0 is within the default 30-day warnDays window')
}

export async function CheckCertificateDelegatesToAMockResponse() {
  const response = { securityDetails: async () => fakeDetails(90) }
  const result = await expectNoThrow(() => checkCertificate(response), 'checkCertificate with a healthy mock response')
  assert(result.available === true, 'result.available should be true')
  assert(result.subject === 'example.com', 'result.subject should come from the mock response')
}

export async function CheckCertificateFailsForAnExpiredMockResponse() {
  const response = { securityDetails: async () => fakeDetails(-1) }
  const err = await expectThrow(
    () => checkCertificate(response, { failOnExpired: true }),
    'checkCertificate with an expired mock response, failOnExpired: true'
  )
  assert(err.message.includes('expired'), `error should mention expiry, got: ${err.message}`)
}

export async function CheckCertificateWithNullResponseFailsInstead() {
  const err = await expectThrow(
    () => checkCertificate(null, { failOnExpired: true }),
    'checkCertificate with a null response, failOnExpired: true'
  )
  assert(err.message.includes('no certificate details'), `error should mention missing details, got: ${err.message}`)
}

const testCasesOK = new Rate('test_case_ok')

const testCases = [
  ExpiredCertDefaultOptionsDoesNotThrow,
  ExpiredCertFailOnExpiredTrueFails,
  NearExpiryDefaultOptionsDoesNotThrow,
  NearExpiryFailOnNearExpiryTrueFails,
  UnavailableDetailsDefaultOptionsDoesNotThrow,
  UnavailableDetailsFailOnExpiredTrueFails,
  BoundaryDaysLeftEqualsWarnDaysCountsAsNearExpiry,
  BoundaryDaysLeftZeroIsNotExpired,
  CheckCertificateDelegatesToAMockResponse,
  CheckCertificateFailsForAnExpiredMockResponse,
  CheckCertificateWithNullResponseFailsInstead,
]

// No `checks` threshold here on purpose -- see the file-level comment above.
export const options = {
  vus: 1,
  iterations: testCases.length,
  thresholds: {
    test_case_ok: ['rate==1.0'],
  },
}

export default async function () {
  try {
    await testCases[__ITER]()
    testCasesOK.add(true)
  } catch (e) {
    testCasesOK.add(false)
    console.log(`test case "${testCases[__ITER].name}" has failed`)
    throw e
  }
}
