import { check } from "k6";
import jsonpath from "https://jslib.k6.io/jsonpath/1.0.2/index.js"

export const options = {
  "duration": "10s",
  "vus": 1
};

const testData = {
  user: {
    name: "Batman"
  }
};

export default function() {
  check(testData, {
    "JSON path works": () => jsonpath.value(testData, 'user.name') === "Batman"
  });
}