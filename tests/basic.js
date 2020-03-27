import { check } from "k6";
import { Counter } from 'k6/metrics';

import jsonpath from "../lib/jsonpath/1.0.2/index.js";
import formurlencoded from "../lib/form-urlencoded/3.0.0/index.js";
import papaparse from "../lib/papaparse/5.1.1/index.js";
import { randomIntBetween, randomItem, uuidv4 } from "../lib/k6-utils/1.0.0/index.js";


export let failedChecks = new Counter('failedChecks');

export const options = {
  iterations: 1,
  thresholds: { 
    'failedChecks': ['count==0']
  }
};

function testJsonPath() {
  const data = {
    user: {
      name: "Batman"
    }
  };
  failedChecks.add(!check(data, {
    "jsonpath works": () => jsonpath.value(data, 'user.name') === "Batman"
  }));
}

function testPapaparse() {
  const csvString = "crocodileName;age\nBert;5";
  const config = {
    header: true
  };

  let parsed = papaparse.parse(csvString, config);

  failedChecks.add(!check(parsed, {
    "papaparse works": (data) =>  parsed.data[0].crocodileName === "Bert"
  }));
}

function testFormurlencoded() {
  const data = {
    param1: "foo",
    param2: "bar"
  };

  failedChecks.add(!check(data, {
    "form-urlencoded works": () => formurlencoded(data) === "param1=foo&param2=bar"
  }));
}

function testRandomBetween(){
  let randomInt = randomIntBetween(1,1);
  console.log(randomInt);
  failedChecks.add(!check(randomInt, {
    "randomBetween works": (r) => r === 1,
  }));
}

function testRandomItem(){
  let items = [1,2,3,4];

  failedChecks.add(!check(randomItem(items), {
    "randomItem works": (item) => items.includes(item),
  }));
}

function testuuidv4(){

  failedChecks.add(!check(uuidv4(), {
    "uuidv4 works": (val) => val.length === 36,
  }));
}


export default function() {
  testJsonPath();
  testFormurlencoded();
  testPapaparse();
  testRandomBetween();
  testRandomItem();
}