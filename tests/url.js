import { check, group } from 'k6'
import { URL, URLSearchParams } from '../lib/url/1.0.0/index.js'
const _ = undefined

export function URLWebAPI() {
  group('URL interface', () => {
    const testURLPath = `/with/path?foo=bar`
    const testURLBase = `https://test.k6.io`
    const testURL = `${testURLBase}${testURLPath}`

    const testURLWithExtra = `https://user:password@test.k6.io:9000`

    check(_, {
      'constructor plain': () => new URL(testURL).toString() === testURL,
      'constructor param base': () => new URL(testURLPath, testURLBase).toString() === testURL,
      'toString()': () => new URL(testURL).toString() === testURL,
      hostname: () => new URL(testURL).hostname === 'test.k6.io',
      href: () => new URL(testURL).href === 'https://test.k6.io/with/path?foo=bar',
      origin: () => new URL(testURL).origin === 'https://test.k6.io',
      password: () => new URL(testURL).password === '',
      pathname: () => new URL(testURL).pathname === '/with/path',
      port: () => new URL(testURL).port === '',
      protocol: () => new URL(testURL).protocol === 'https:',
      search: () => new URL(testURL).search === '?foo=bar',
      searchParams: () => {
        const _url = new URL(testURL)
        _url.searchParams.append('utm_medium', 'organic')
        _url.searchParams.append('utm_source', 'test')
        _url.searchParams.append('multiple', 'foo')
        _url.searchParams.append('multiple', 'bar')
        return (
          _url.toString() ===
          `https://test.k6.io/with/path?foo=bar&utm_medium=organic&utm_source=test&multiple=foo&multiple=bar`
        )
      },
      username: () => new URL(testURL).username === '',
      password: () => new URL(testURLWithExtra).password === 'password',
      port: () => new URL(testURLWithExtra).port === '9000',
      username: () => new URL(testURLWithExtra).username === 'user',
    })
  })

  group('URLSearchParams interface', () => {
    const params = [
      ['utm_medium', 'organic'],
      ['utm_source', 'test'],
      ['multiple', 'foo'],
      ['multiple', 'bar'],
    ]
    const paramsSerialized = 'utm_medium=organic&utm_source=test&multiple=foo&multiple=bar'

    check(_, {
      'constructor plain': () => {
        return new URLSearchParams(params).toString() === paramsSerialized
      },

      'toString()': () => {
        return new URLSearchParams(params).toString() === paramsSerialized
      },

      'append()': () => {
        const _searchParams = new URLSearchParams(params)
        _searchParams.append('zz', 1)
        return _searchParams.toString() === `${paramsSerialized}&zz=1`
      },

      'delete()': () => {
        const _searchParams = new URLSearchParams(params)
        _searchParams.delete('multiple')
        return _searchParams.toString() === 'utm_medium=organic&utm_source=test'
      },

      'entries()': () => {
        const _searchParams = new URLSearchParams(params)
        return new URLSearchParams([..._searchParams.entries()]).toString() === paramsSerialized
      },

      'forEach()': () => {
        const _searchParams = new URLSearchParams(params)
        return typeof _searchParams.forEach === 'function'
      },

      'get()': () => {
        const _searchParams = new URLSearchParams(params)
        return _searchParams.get('utm_medium') === 'organic'
      },

      'getAll()': () => {
        const _searchParams = new URLSearchParams(params)
        return _searchParams.getAll('multiple').join(',') === 'foo,bar'
      },

      'has()': () => {
        const _searchParams = new URLSearchParams(params)
        return _searchParams.has('multiple') === true
      },

      'keys()': () => {
        const _searchParams = new URLSearchParams(params)
        return [..._searchParams.keys()].join(',') === params.map((pairs) => pairs[0]).join(',')
      },

      'values()': () => {
        const _searchParams = new URLSearchParams(params)
        return [..._searchParams.values()].join(',') === params.map((pairs) => pairs[1]).join(',')
      },

      'set()': () => {
        const _searchParams = new URLSearchParams(params)
        _searchParams.set('utm_source', 'email')
        return _searchParams.get('utm_source') === 'email'
      },

      'set()': () => {
        const _searchParams = new URLSearchParams([
          ['c', '3'],
          ['b', '2'],
          ['a', '1'],
        ])
        _searchParams.sort()
        return _searchParams.toString() === 'a=1&b=2&c=3'
      },
    })
  })
}
