import { check } from "k6";
import http from "k6/http";

import jsonpath from "../lib/jsonpath/1.0.2/index.js";
import formurlencoded from "../lib/form-urlencoded/3.0.0/index.js";
import papaparse from "../lib/papaparse/5.1.1/index.js";
import { describe } from "../lib/kahwah/0.1.6/index.js";
import { Httpx } from "../lib/httpx/0.0.6/index.js";
import { chai, expect, describe as chaidescribe } from "../lib/k6chaijs/4.3.4.0/index.js";
import { initContractPlugin } from '../lib/k6chaijs-contracts/4.3.4.0/index.js';
import { randomIntBetween, randomItem, uuidv4 } from "../lib/k6-utils/1.0.0/index.js";
import { Mustache } from "../lib/mustache/4.2.0/index.js"

initContractPlugin(chai);

function testJsonPath() {
  const data = {
    user: {
      name: "Batman"
    }
  };
  check(data, {
    "jsonpath works": () => jsonpath.value(data, 'user.name') === "Batman"
  });
}

function testPapaparse() {
  const csvString = "crocodileName;age\nBert;5";
  const config = {
    header: true
  };

  let parsed = papaparse.parse(csvString, config);

  check(parsed, {
    "papaparse works": (data) =>  parsed.data[0].crocodileName === "Bert"
  })
}

function testFormurlencoded() {
  const data = {
    param1: "foo",
    param2: "bar"
  };

  check(data, {
    "form-urlencoded works": () => formurlencoded(data) === "param1=foo&param2=bar"
  });
}

function testRandomBetween(){
  let randomInt = randomIntBetween(1,1);
  console.log(randomInt);
  check(randomInt, {
    "randomBetween works": (r) => r === 1,
  });
}

function testRandomItem(){
  let items = [1,2,3,4];

  check(randomItem(items), {
    "randomItem works": (item) => items.includes(item),
  });
}

function testuuidv4(){

  check(uuidv4(), {
    "uuidv4 works": (val) => val.length === 36,
  });
}

function testKahwah(){

  check(null, {
    "kahwah works": (k) => typeof describe == "function",
  });
}

function testMustache() {
  check('null', {
    'mustache works': (k) => typeof Mustache == 'object',
  })
}

function testk6chaijs(){

  chaidescribe("k6 chai js test", ()=> {
    expect('k6chaijs').to.equal("k6chaijs")
  })

}

function testk6chaijscontracts(){

  const crocodileListAPIcontract = {
    items: {
      "type": "object",
      "properties": {
        "id": {
          "type": "number"
        },
        "name": {
          "type": "string"
        },
        "age": {
          "type": "number",
          "minimum": 1,
          "maximum": 1000
        },
        "date_of_birth": {
          "type": "string",
          "format": "date"
        }
      },
      "required": [
        "id",
        "name",
        "age",
        "date_of_birth"
      ]
    }
  };

  chaidescribe('[Crocs service] Fetch list of crocs', () => {
    let response = http.get('https://test-api.k6.io/public/crocodiles');
    expect(response).to.have.validJsonBody()
    expect(response.json(), "Croc List schema").to.matchSchema(crocodileListAPIcontract)
  })

}

export {
  testJsonPath,
  testFormurlencoded,
  testPapaparse,
  testRandomBetween,
  testRandomItem,
  testuuidv4,
  testKahwah,
  testk6chaijs,
  testk6chaijscontracts,
  testMustache,
}
