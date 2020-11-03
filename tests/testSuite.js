import { check } from 'k6'
import { Counter } from 'k6/metrics'
import {
  testJsonPath,
  testFormurlencoded,
  testPapaparse,
  testRandomBetween,
  testRandomItem,
  testuuidv4,
} from './basic.js'
import { papaparseTest } from './papaparseRedingFile.js'
import { httpxBatchTest } from './httpx.js'
import { newAjv } from './ajv-test.js'
import { CrocFlow } from './crocFlow.js'
import { URLWebAPI } from './url.js'

export const options = {
  iterations: 1,
  thresholds: {
    checks: ['rate==1.0'],
  },
}

export default function () {
  URLWebAPI()
  testJsonPath()
  testFormurlencoded()
  testPapaparse()
  testRandomBetween()
  testRandomItem()
  testuuidv4()
  papaparseTest()
  httpxBatchTest()
  newAjv()
  CrocFlow()
}
