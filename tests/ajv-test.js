import { sleep } from "k6";
import Ajv from "../lib/ajv/6.12.5/index.js";

export let options = {
  iterations: 1,
  vus: 1,
};

export default function() {
  let ajv = new Ajv();
}
