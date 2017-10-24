import {
	setApiRoot,
	getApiRoot,
	doFetch,
	__RewireAPI__ as FetchServiceRewireAPI
} from '../src/services/fetchService'

describe('Path construction', () => {
	const constructPath = FetchServiceRewireAPI.__get__('constructPath')
	test('Should not add a question mark to a path without query params', () => {
		const path = constructPath({ path: 'http://abc.xyz/api/foo' })
		expect(path).toEqual('http://abc.xyz/api/foo')
	})

	test('Should add a single query param', () => {
		const path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz'
			}
		})
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz')
	})

	test('Should add mulitple query params', () => {
		const path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				quux: 'wawa'
			}
		})
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz&quux=wawa')
	})

	test('Should encode params', () => {
		const path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				$foo: '/bar'
			}
		})
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz&%24foo=%2Fbar')
	})

	test('Should prepend baseUrl via config', () => {
		const existingApiRoot = getApiRoot()
		setApiRoot('http://abc.xyz')
		const path = constructPath({ path: '/api/foo' })
		expect(path).toEqual('http://abc.xyz/api/foo')
		setApiRoot(existingApiRoot)
	})
})

describe('doFetch', () => {
	test('Require config.path', () => {
		expect(() => {
			const gen = doFetch()
			gen.next()
		}).toThrow(/Cannot read property 'path' of undefined/)
	})

	test('Require config.path 2', () => {
		expect(() => {
			const gen = doFetch({})
			gen.next()
		}).toThrow(/'config.path' is required/)
	})

	test('Basic GET', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com' })
		const response = gen.next()
		expect(response.value.CALL.args).toEqual([
			'http://www.google.com',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json; charset=utf-8'
				}
			}
		])
		global.fetch = _fetch
	})

	test('Basic POST w/ headers', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com', method: 'POST', body: { foo: 'bar' } })
		const response = gen.next()
		expect(response.value.CALL.args).toEqual([
			'http://www.google.com',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=utf-8'
				},
				body: JSON.stringify({ foo: 'bar' })
			}
		])
		global.fetch = _fetch
	})

	test('Basic GET w/ headers & form urlencoded', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({
			path: 'http://www.google.com',
			method: 'POST',
			body: 'foo=bar&baz=quux',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
		})
		const response = gen.next()
		expect(response.value.CALL.args).toEqual([
			'http://www.google.com',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body: 'foo=bar&baz=quux'
			}
		])
		global.fetch = _fetch
	})

	test('Basic GET test empty response from server', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(null)
		expect(sagaDone.done).toEqual(true)
		global.fetch = _fetch
	})

	test('Basic GET test non-empty response from server', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com' })
		const response = gen.next()
		const response2 = gen.next({ ok: true, json: () => ({ foo: 'bar' }) })
		expect(response2.value.CALL.fn()).toEqual({ foo: 'bar' })
		global.fetch = _fetch
	})

	test('Basic GET test error response from server', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const response = {
			ok: false,
			status: 400,
			statusText: 'Bad Request',
			json: () => ({ foo: 'bar' })
		}
		const callResponseJsonEffect = gen.next(response)
		const sagaDone = gen.next(response.json())
		expect(sagaDone.value).toEqual({
			title: 'Error',
			message: 'Bad Request',
			code: 400,
			foo: 'bar'
		})
		expect(sagaDone.done).toEqual(true)
		global.fetch = _fetch
	})
})
