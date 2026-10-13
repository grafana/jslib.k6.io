// Default import
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js'

// Non default import
import { randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

const csvString = 'name;age\nBert;5'
const parsed = papaparse.parse(csvString, { header: true })
console.log(parsed.data[0].name) // Bert

console.log(randomIntBetween(1, 10))
