import { check } from "k6";

import jsonpath from "../lib/jsonpath/1.0.2/index.js";
import formurlencoded from "../lib/form-urlencoded/3.0.0/index.js";

export const options = {
  "duration": "10s",
  "vus": 1
};

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

function testFormurlencoded() {
  const data = {
    param1: "foo",
    param2: "bar"
  };

  check(data, {
    "form-urlencoded works": () => formurlencoded(data) === "param1=foo&param2=bar"
  });
}

export default function() {
  testJsonPath();
  testFormurlencoded();
}