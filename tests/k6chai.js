import { expect as expect4340, describe as describe4340 } from '../lib/k6chaijs/4.3.4.0/index.js'
import { expect as expect4341, describe as describe4341 } from '../lib/k6chaijs/4.3.4.1/index.js'
import { expect as expect4342, describe as describe4342 } from '../lib/k6chaijs/4.3.4.2/index.js'
import { expect as expect4343, describe as describe4343 } from '../lib/k6chaijs/4.3.4.3/index.js'
import { expect as expect4500, describe as describe4500 } from '../lib/k6chaijs/4.5.0.0/index.js'
import { expect as expect4501, describe as describe4501 } from '../lib/k6chaijs/4.5.0.1/index.js'

export default function testk6chaijs() {
  const expected = 'k6chaijs'
  const alias = 'alias'

  describe4340('k6chaijs v4.3.4.0 test', () => {
    expect4340(expected, alias).to.equal(expected)
  })

  describe4341('k6chaijs v4.3.4.1 test', () => {
    expect4341(expected, alias).to.equal(expected)
  })

  describe4342('k6chaijs v4.3.4.2 test', () => {
    expect4342(expected, alias).to.equal(expected)
  })

  describe4343('k6chaijs v4.3.4.3 test', () => {
    expect4343(expected, alias).to.equal(expected)
  })

  describe4500('k6chaijs v4.5.0.0 test', () => {
    expect4500(expected, alias).to.equal(expected)
  })

  describe4501('k6chaijs v4.5.0.1 test', () => {
    expect4501(expected, alias).to.equal(expected)
  })
}
