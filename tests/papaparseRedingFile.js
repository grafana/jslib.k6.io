import papaparse from '../lib/papaparse/5.1.1/index.js'

const csvData = papaparse.parse(open('./data/sampleCSV-100-rows.csv'), { header: true })

function papaparseTest() {
  let randomUser = csvData.data[Math.floor(Math.random() * csvData.data.length)]

  const params = {
    login: randomUser.username,
    password: randomUser.password,
  }
}

export { papaparseTest }
