import { check } from "k6";
import jsonpath from "jslib.k6.io/jsonpath/1.0.2/index.js"
import { parse, unparse } from "jslib.k6.io/papaparse/5.0.0/index.js"

export const options = {
  "duration": "10s",
  "vus": 1
};

function testPapaParse() {
  const data = `name,email,role\sBatman,batman@batman.email,superhero`;
  check(data, {
    "Papaparse works": () => unparse(parse(data))
  });
}

function testJsonPath() {
  const data = {
    user: {
      name: "Batman"
    }
  };
  check(data, {
    "JSON path works": () => jsonpath.value(data, 'user.name') === "Batman"
  });
}

export default function() {
  testPapaParse();
  testJsonPath();
}