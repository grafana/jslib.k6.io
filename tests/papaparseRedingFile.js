import { sleep } from "k6";

import papaparse from "../lib/papaparse/5.1.1/index.js";

export const options = {
  iterations: 1,
};

const csvData = papaparse.parse(open('./data/sampleCSV-100-rows.csv'), { header: true });

export default function() {

  let randomUser = csvData.data[Math.floor(Math.random() * csvData.data.length)];

  const params = {
    login: randomUser.username,
    password: randomUser.password,
  };

}

