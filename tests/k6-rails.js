import { check } from 'k6'

import { turboStreamName, cableUrl, csrfToken, csrfParam, fetchMeta } from '../lib/k6-rails/0.1.0/index.js';

function testTurboStreamName() {
  const mockedData = {
    find: (_) => {
        return { attr: (_) => 'test name' }
    }
  };

  check(turboStreamName(mockedData), {
    'turboStreamName works': (r) => r === 'test name'
  })
}

function testCableUrl() {
  const mockedData = {
    find: (_) => {
      return { attr: (_) => 'cable url' }
    }
  }

  check(cableUrl(mockedData), {
    'cableUrl works': (r) => r === 'cable url'
  })
}

function testCsrfToken() {
  const mockedData = {
    find: (_) => {
      return { attr: (_) => 'csrf-token' }
    }
  }

  check(csrfToken(mockedData), {
    'csrfToken works': (r) =>  r === 'csrf-token'
  })
}

function testCsrfParam() {
  const mockedData = {
    find: (_) => {
      return { attr: (_) => 'csrf-param' }
    }
  }

  check(csrfParam(mockedData), {
    'csrfToken works': (r) =>  r === 'csrf-param'
  })
}

function testFetchMeta() {
  const mockedData = {
    find: (_) => {
      return { attr: (_) => 'width=device-width, initial-scale=1' }
    }
  }

  check(fetchMeta(mockedData, 'name', 'viewport', 'content'), {
    'fetchMeta works': (r) => r === 'width=device-width, initial-scale=1'
  })
}

export {
  testTurboStreamName,
  testCableUrl,
  testCsrfToken,
  testCsrfParam,
  testFetchMeta,
}
