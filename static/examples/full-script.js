import { check, sleep } from 'k6'
import { randomIntBetween, randomItem, uuidv4 } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

export const options = {
  duration: '10s',
  vus: 1,
}

const testData = {
  user: {
    name: 'Batman',
  },
}

export default function () {
  check(testData, {
    'user is Batman': () => testData.user.name === 'Batman',
  })

  console.log(uuidv4())
  console.log(randomItem([1, 2, 3, 4]))

  sleep(randomIntBetween(1, 5)) // sleep between 1 and 5 seconds
}
