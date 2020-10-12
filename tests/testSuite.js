import { check } from "k6";
import { Counter } from 'k6/metrics';
import { testJsonPath,
         testFormurlencoded,
         testPapaparse,
         testRandomBetween,
         testRandomItem,
         testuuidv4 } from './basic.js'
import {papaparseTest} from "./papaparseRedingFile.js";
import {httpxBatchTest} from "./httpx.js";

export const options = {
  iterations: 1,
  thresholds: {
    'checks': ['rate==1.0']
  }
};


export default function() {
  testJsonPath();
  testFormurlencoded();
  testPapaparse();
  testRandomBetween();
  testRandomItem();
  testuuidv4();
  papaparseTest();
  httpxBatchTest();

}