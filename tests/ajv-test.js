import { sleep } from "k6";
import Ajv from "../lib/ajv/6.12.5/index.js";


function newAjv() {
  let ajv = new Ajv();
}

export {
  newAjv,
}
