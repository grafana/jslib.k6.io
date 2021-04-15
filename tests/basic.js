import { check } from "k6";
import { Counter } from 'k6/metrics';

import jsonpath from "../lib/jsonpath/1.0.2/index.js";
import formurlencoded from "../lib/form-urlencoded/3.0.0/index.js";
import papaparse from "../lib/papaparse/5.1.1/index.js";

import { randomIntBetween, randomItem, uuidv4, findBetween } from "../lib/k6-utils/1.0.0/index.js";

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

function testFindBetween(){
  let str = "<find>me</find>";

  check(findBetween(str, "<find>", "</find>"), {
    "findBetween works": (val) => val === "me",
  });  
}

export {
  testJsonPath,
  testFormurlencoded,
  testPapaparse,
  testRandomBetween,
  testRandomItem,
  testuuidv4,
  testFindBetween,
}