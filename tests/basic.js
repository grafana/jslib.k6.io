import { check } from "k6";
import { Counter } from 'k6/metrics';

import jsonpath from "../lib/jsonpath/1.0.2/index.js";
import formurlencoded from "../lib/form-urlencoded/3.0.0/index.js";
import papaparse from "../lib/papaparse/5.1.1/index.js";

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

export default function() {
  testJsonPath();
  testFormurlencoded();
  testPapaparse();
}