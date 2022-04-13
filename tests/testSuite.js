import { Rate } from 'k6/metrics'

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
  testk6chaijs,
  testk6chaijscontracts,
} from './basic.js'
import { papaparseTest } from './papaparseRedingFile.js'
import { httpxBatchTest, httpxTestAbsoluteURLs } from './httpx.js'
import { newAjv } from './ajv-test.js'
import { CrocFlow } from './crocFlow.js'
import { URLWebAPI } from './url.js'
import { testAWS } from './aws.js'


let testCasesOK = new Rate('test_case_ok');

const testCases = [
  URLWebAPI, testJsonPath, testFormurlencoded, testPapaparse, testRandomBetween,
  testRandomItem, testuuidv4, papaparseTest, httpxBatchTest, newAjv, CrocFlow,
  testKahwah, httpxTestAbsoluteURLs, testk6chaijs, testk6chaijscontracts,
  testFindBetween, testNormalDistributionStages, testRandomString, testAWS
];

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
    testCases[__ITER]();
    testCasesOK.add(true);
  } catch (e) {
    testCasesOK.add(false);
    throw e;
  }
}
