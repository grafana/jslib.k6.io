import { sleep } from 'k6'
import { uuidv4 } from '../lib/k6-utils/1.4.0/index.js'

export let options = {
  duration: '1m',
  vus: 1,
}

// number of iterations = number of times the function executed
// 1.3M executions in 60 seconds on my laptop
export default function () {
  uuidv4()
}
