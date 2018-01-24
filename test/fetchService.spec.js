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

	test('Basic GET with contentType', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com', contentType: 'text/html; charset=utf-8' })
		const response = gen.next()
		expect(response.value.CALL.args).toEqual([
			'http://www.google.com',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'text/html; charset=utf-8'
				}
			}
		])
		global.fetch = _fetch
	})

	test('Basic GET with contentType and other headers', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({
			path: 'http://www.google.com',
			contentType: 'text/html; charset=utf-8',
			headers: { 'some-header': 'some-header-value' }
		})
		const response = gen.next()
		expect(response.value.CALL.args).toEqual([
			'http://www.google.com',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					'some-header': 'some-header-value'
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

	test('Basic POST w/ form data', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({
			path: 'http://www.google.com',
			method: 'POST',
			body: new FormData(),
			contentType: 'multipart/form-data'
		})
		const response = gen.next()
		expect(response.value.CALL.args[1].method).toEqual('POST')
		expect(response.value.CALL.args[1].headers).toEqual({ 'Content-Type': 'multipart/form-data' })
		expect(response.value.CALL.args[1].body).toBeInstanceOf(FormData)
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

	test('Basic GET test non-empty response from server', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const response = {
			ok: true,
			status: 200,
			json: () => ({ foo: 'bar' })
		}
		const callResponseJsonEffect = gen.next(response)
		const sagaDone = gen.next(response.json())
		expect(sagaDone.value).toEqual({
			ok: true,
			status: 200,
			data: {
				foo: 'bar'
			}
		})
		expect(sagaDone.done).toEqual(true)
		global.fetch = _fetch
	})

	test('Basic GET test empty response from server', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual()
		expect(sagaDone.done).toEqual(true)
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
		expect(callResponseJsonEffect.value.CALL.fn()).toEqual({ foo: 'bar' })
		const sagaDone = gen.next(response.json())
		expect(sagaDone.value).toEqual({
			ok: false,
			status: 400,
			data: {
				title: 'Error',
				message: 'Bad Request',
				code: 400,
				foo: 'bar'
			}
		})
		expect(sagaDone.done).toEqual(true)
		global.fetch = _fetch
	})

	test('PUT with 204 response', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const putBody = { foo: 'bar', baz: 'quux' }
		const gen = doFetch({ path: 'http://www.google.com', method: 'PUT', body: putBody })
		const callFetchEffect = gen.next()
		expect(callFetchEffect.value.CALL.args).toEqual([
			'http://www.google.com',
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json; charset=utf-8'
				},
				body: JSON.stringify(putBody)
			}
		])
		const response = {
			ok: true,
			status: 204,
			statusText: 'NoContent'
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value).toEqual({
			ok: true,
			status: 204,
			data: putBody
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual()
		expect(sagaDone.done).toEqual(true)
		global.fetch = _fetch
	})

	test('DELETE with 204 response', () => {
		const _fetch = global.fetch
		global.fetch = jest.fn(() => {})
		const gen = doFetch({ path: 'http://www.google.com', method: 'DELETE' })
		const callFetchEffect = gen.next()
		expect(callFetchEffect.value.CALL.args).toEqual([
			'http://www.google.com',
			{
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json; charset=utf-8'
				}
			}
		])
		const response = {
			ok: true,
			status: 204,
			statusText: 'NoContent'
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value).toEqual({
			ok: true,
			status: 204
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual()
		expect(sagaDone.done).toEqual(true)
		global.fetch = _fetch
	})
})
