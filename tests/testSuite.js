import { Rate } from 'k6/metrics'

import { papaparseTest } from './papaparseRedingFile.js'
import { httpxBatchTest, httpxTestAbsoluteURLs } from './httpx.js'
import { newAjv } from './ajv-test.js'
import { CrocFlow } from './crocFlow.js'
import { URLWebAPI } from './url.js'
import { testAWS } from './aws.js'
import {
  testPyroscopeNoBody,
  testPyroscopeWithBody,
  testPyroscopeRequestWithParams,
} from './instrumentation-pyroscope.js'
import {
  testTempoW3CPropagator,
  testTempoJaegerPropagator,
} from './instrumentation-tempo.js'
import {
  testJsonPath,
  testFormurlencoded,
  testPapaparse,
  testFindBetween,
  testNormalDistributionStages,
  testRandomBetween,
  testRandomItem,
  testRandomString,
  testuuidv4,
  testKahwah,
  testGetCurrentStageIndex,
  testTagWithCurrentStageIndex,
  testTagWithCurrentStageProfile,
  testk6chaijs,
  testk6chaijscontracts,
} from './basic.js'

let testCasesOK = new Rate('test_case_ok')

const testCases = [
  URLWebAPI,
  testJsonPath,
  testFormurlencoded,
  testPapaparse,
  testRandomBetween,
  testRandomItem,
  testuuidv4,
  testGetCurrentStageIndex,
  testTagWithCurrentStageIndex,
  testTagWithCurrentStageProfile,
  papaparseTest,
  httpxBatchTest,
  newAjv,
  CrocFlow,
  testKahwah,
  httpxTestAbsoluteURLs,
  testk6chaijs,
  testk6chaijscontracts,
  testFindBetween,
  testNormalDistributionStages,
  testRandomString,
  testAWS,
  testPyroscopeNoBody,
  testPyroscopeWithBody,
  testPyroscopeRequestWithParams,
  testTempoW3CPropagator,
  testTempoJaegerPropagator,
]

export const options = {
  vus: 1,
  iterations: testCases.length,
  thresholds: {
    checks: ['rate==1.0'],
    test_case_ok: ['rate==1.0'],
  },
}

export default function () {
  try {
    testCases[__ITER]()
    testCasesOK.add(true)
  } catch (e) {
    testCasesOK.add(false)
    console.log(`test case at index ${__ITER} has failed`)
    throw e
  }
}
