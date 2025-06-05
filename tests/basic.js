import { check } from 'k6'
import http from 'k6/http'

import jsonpath from '../lib/jsonpath/1.0.2/index.js'
import formurlencoded from '../lib/form-urlencoded/3.0.0/index.js'
import papaparse from '../lib/papaparse/5.1.1/index.js'
import { describe } from '../lib/kahwah/0.1.6/index.js'
import { initContractPlugin } from '../lib/k6chaijs-contracts/4.3.4.0/index.js'
import chai, { expect, describe as chaidescribe } from '../lib/k6chaijs/4.5.0.0/index.js'
import testk6chaijs from './k6chai.js'
import {
  findBetween,
  normalDistributionStages,
  randomIntBetween,
  randomItem,
  randomString,
  uuidv4,
  getCurrentStageIndex,
  tagWithCurrentStageIndex,
  tagWithCurrentStageProfile,
} from '../lib/k6-utils/1.4.0/index.js'
import pyroscope from '../lib/http-instrumentation-pyroscope/1.0.2/index.js'
import tempo from '../lib/http-instrumentation-tempo/1.0.1/index.js'

pyroscope.instrumentHTTP()
tempo.instrumentHTTP({
  propagator: "w3c",
})

initContractPlugin(chai)

function testJsonPath() {
  const data = {
    user: {
      name: 'Batman',
    },
  }
  check(data, {
    'jsonpath works': () => jsonpath.value(data, 'user.name') === 'Batman',
  })
}

function testPapaparse() {
  const csvString = 'crocodileName;age\nBert;5'
  const config = {
    header: true,
  }

  let parsed = papaparse.parse(csvString, config)

  check(parsed, {
    'papaparse works': (data) => parsed.data[0].crocodileName === 'Bert',
  })
}

function testFormurlencoded() {
  const data = {
    param1: 'foo',
    param2: 'bar',
  }

  check(data, {
    'form-urlencoded works': () => formurlencoded(data) === 'param1=foo&param2=bar',
  })
}

function testFindBetween() {
  check(findBetween('**a**', '**', '**'), {
    'findBetween works': (s) => s === 'a',
  })
}

function testNormalDistributionStages() {
  check(normalDistributionStages(1, 1, 1), {
    // This only ensures the function is runnable...not that it is working
    'normalDistributionStages works': (dist) => dist.length === 3,
  })
}

function testRandomBetween() {
  let randomInt = randomIntBetween(1, 1)

  check(randomInt, {
    'randomBetween works': (r) => r === 1,
  })
}

function testRandomItem() {
  let items = [1, 2, 3, 4]

  check(randomItem(items), {
    'randomItem works': (item) => items.includes(item),
  })
}

function testRandomString() {
  check(randomString(5, 'a'), {
    'randomString works': (s) => s === 'aaaaa',
  })
}

function testuuidv4() {
  check(uuidv4(), {
    'uuidv4 works': (val) => val.length === 36,
  })
}

function testKahwah() {
  check(null, {
    'kahwah works': (k) => typeof describe == 'function',
  })
}

function testGetCurrentStageIndex() {
  check(getCurrentStageIndex, {
    'getCurrentStageIndex works': (k) => typeof describe == 'function',
  })
}

function testTagWithCurrentStageIndex() {
  check(tagWithCurrentStageIndex, {
    'tagWithCurrentStageIndex works': (k) => typeof describe == 'function',
  })
}

function testTagWithCurrentStageProfile() {
  check(tagWithCurrentStageProfile, {
    'tagWithCurrentStageProfile works': (k) => typeof describe == 'function',
  })
}

function testk6chaijscontracts() {
  const crocodileListAPIcontract = {
    items: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
        },
        name: {
          type: 'string',
        },
        age: {
          type: 'number',
          minimum: 1,
          maximum: 1000,
        },
        date_of_birth: {
          type: 'string',
          format: 'date',
        },
      },
      required: ['id', 'name', 'age', 'date_of_birth'],
    },
  }

  chaidescribe('[Crocs service] Fetch list of crocs', () => {
    let response = http.get('https://quickpizza.grafana.com/api/doughs')
    expect(response).to.have.validJsonBody()
    expect(response.json(), 'Croc List schema').to.matchSchema(crocodileListAPIcontract)
  })
}

function testHTTPInstrumentation() {
  const res = http.get('https://quickpizza.grafana.com/api/doughs')
  expect(String(res.request.headers['Traceparent'])).to.match(/^00-[0-9a-f]{32}-[0-9a-f]{16}-[01]{2}$/)
  expect(String(res.request.headers['Baggage'])).to.contain('k6.test_run_id').and.contain('k6.scenario').and.contain('k6.name')
}

export {
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
  testHTTPInstrumentation,
}
