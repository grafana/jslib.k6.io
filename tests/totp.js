import { check } from 'k6'
import { TOTP } from '../lib/totp/1.0.0/index.js'

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: { checks: ['rate==1.00'] },
}

export default async function () {
    // RFC 6238 test secret: "12345678901234567890" in base32
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

    // Basic functionality test (6 digits)
    const totp6 = new TOTP(secret, 6)
    const code6 = await totp6.gen()
    check(code6, {
        '6-digit code length': (c) => c.length === 6,
        '6-digit code is numeric': (c) => /^\d+$/.test(c),
    })

    // Verify the generated code
    const isValid = await totp6.verify(code6)
    check(isValid, {
        'verify returns true for valid code': (v) => v === true,
    })

    // RFC 6238 test vectors using bias parameter
    const totp8 = new TOTP(secret, 8)
    const now = Math.floor(Date.now() / 1000)

    // Test at time=59 seconds, expected=94287082
    const code59 = await totp8.gen(30, now - 59)
    check(code59, {
        'RFC6238 t=59s: 94287082': (c) => c === '94287082',
    })

    // Test at time=1111111109, expected=07081804
    const code1111111109 = await totp8.gen(30, now - 1111111109)
    check(code1111111109, {
        'RFC6238 t=1111111109: 07081804': (c) => c === '07081804',
    })

    // Test at time=1234567890, expected=89005924
    const code1234567890 = await totp8.gen(30, now - 1234567890)
    check(code1234567890, {
        'RFC6238 t=1234567890: 89005924': (c) => c === '89005924',
    })

    // Test at time=2000000000, expected=69279037
    const code2000000000 = await totp8.gen(30, now - 2000000000)
    check(code2000000000, {
        'RFC6238 t=2000000000: 69279037': (c) => c === '69279037',
    })

    console.log('All TOTP tests passed!')
}
