import { describe } from '../lib/functional/0.0.3/index.js'
import { Httpx, Get } from '../lib/httpx/0.0.3/index.js'
import { randomIntBetween, randomItem, uuidv4 } from '../lib/k6-utils/1.4.0/index.js'
import { crocodileAPIcontract, crocodileListAPIcontract } from './data/contracts.js'

const USERNAME = `user${uuidv4()}@example.com` // Set your own email;
const PASSWORD = 'superCroc2019'

let session = new Httpx({ baseURL: 'https://test-api.k6.io' })

function CrocFlow() {
  describe('Fetch public crocs', (t) => {
    let responses = session.batch(
      [
        new Get('/public/crocodiles/1/'),
        new Get('/public/crocodiles/2/'),
        new Get('/public/crocodiles/3/'),
        new Get('/public/crocodiles/4/'),
      ],
      {
        tags: { name: 'PublicCrocs' },
      }
    )

    responses.forEach((response) => {
      t.expect(response.status)
        .as('response status')
        .toEqual(200)
        .and(response)
        .toHaveValidJson()
        .and(response.json())
        .toMatchAPISchema(crocodileAPIcontract)
        .and(response.json('age'))
        .as('croc age')
        .toBeGreaterThan(7)
    })
  }) &&
    describe(`Create a test user ${USERNAME}`, (t) => {
      let resp = session.post(`/user/register/`, {
        first_name: 'Crocodile',
        last_name: 'Owner',
        username: USERNAME,
        password: PASSWORD,
      })

      t.expect(resp.status).as('status').toEqual(201).and(resp).toHaveValidJson()
    }) &&
    describe(`Authenticate the new user ${USERNAME}`, (t) => {
      let resp = session.post(`/auth/token/login/`, {
        username: USERNAME,
        password: PASSWORD,
      })

      t.expect(resp.status)
        .as('Auth status')
        .toBeBetween(200, 204)
        .and(resp)
        .toHaveValidJson()
        .and(resp.json('access'))
        .as('auth token')
        .toBeTruthy()

      let authToken = resp.json('access')
      // set the authorization header on the session for the subsequent requests.
      session.addHeader('Authorization', `Bearer ${authToken}`)
    })

  let newCrocId = null

  describe('Create a new crocodile', (t) => {
    let payload = {
      name: `Croc Name`,
      sex: randomItem(['M', 'F']),
      date_of_birth: '2019-01-01',
    }

    let resp = session.post(`/my/crocodiles/`, payload)

    t.expect(resp.status).as('Croc creation status').toEqual(201).and(resp).toHaveValidJson()

    newCrocId = resp.json('id')
  }) &&
    describe('Fetch private crocs', (t) => {
      let response = session.get('/my/crocodiles/')

      t.expect(response.status)
        .as('response status')
        .toEqual(200)
        .and(response)
        .toHaveValidJson()
        .and(response.json().length)
        .as('number of crocs')
        .toEqual(1)
        .and(response.json())
        .toMatchAPISchema(crocodileListAPIcontract)
    }) &&
    describe('Update the croc', (t) => {
      let payload = {
        name: `New name`,
      }

      let resp = session.patch(`/my/crocodiles/${newCrocId}/`, payload)

      t.expect(resp.status)
        .as('Croc patch status')
        .toEqual(200)
        .and(resp)
        .toHaveValidJson()
        .and(resp.json('name'))
        .as('name')
        .toEqual('New name')

      let resp1 = session.get(`/my/crocodiles/${newCrocId}/`)
    }) &&
    describe('Delete the croc', (t) => {
      let resp = session.delete(`/my/crocodiles/${newCrocId}/`)

      t.expect(resp.status).as('Croc delete status').toEqual(204)
    })
}

export { CrocFlow }
