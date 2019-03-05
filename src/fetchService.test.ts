import { setApiRoot, getApiRoot, doFetch, constructPath } from './fetchService'

describe('constructPath', () => {
	test('should require config.path', () => {
		expect(() => {
			constructPath({
				path: undefined,
			})
		}).toThrow(/'config.path' is required for fetchService/)
	})

	test('Should not add a question mark to a path without query params', () => {
		const path = constructPath({ path: 'http://abc.xyz/api/foo' })
		expect(path).toEqual('http://abc.xyz/api/foo')
	})

	test('Should add a single query param', () => {
		const path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
			},
		})
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz')
	})

	test('Should add mulitple query params', () => {
		const path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				quux: 'wawa',
			},
		})
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz&quux=wawa')
	})

	test('Should encode params', () => {
		const path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				$foo: '/bar',
			},
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
			const gen = doFetch({
				path: '',
			})
			gen.next()
		}).toThrow(/'config.path' is required for fetchService/)
	})

	test('Basic GET', () => {
		const gen = doFetch({ path: 'http://www.google.com' })
		const response = gen.next()
		expect(response.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
			},
		])
	})

	test('GET does not send body', () => {
		const gen = doFetch({ path: 'http://www.google.com', body: { somekey: 'somevalue' } })
		const response = gen.next()
		expect(response.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
			},
		])
	})

	test('Basic GET with contentType', () => {
		const gen = doFetch({
			path: 'http://www.google.com',
			contentType: 'text/html; charset=utf-8',
		})
		const response = gen.next()
		expect(response.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
				},
			},
		])
	})

	test('Basic GET with contentType and other headers', () => {
		const gen = doFetch({
			path: 'http://www.google.com',
			contentType: 'text/html; charset=utf-8',
			headers: { 'some-header': 'some-header-value' },
		})
		const response = gen.next()
		expect(response.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'GET',
				headers: {
					'Content-Type': 'text/html; charset=utf-8',
					'some-header': 'some-header-value',
				},
			},
		])
	})

	test('Basic POST w/ headers', () => {
		const gen = doFetch({ path: 'http://www.google.com', method: 'POST', body: { foo: 'bar' } })
		const response = gen.next()
		expect(response.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
				body: JSON.stringify({ foo: 'bar' }),
			},
		])
	})

	test('Basic POST w/ form data', () => {
		const gen = doFetch({
			path: 'http://www.google.com',
			method: 'POST',
			body: new FormData(),
			contentType: 'multipart/form-data',
		})
		const response = gen.next()
		expect(response.value.payload.args[1].method).toEqual('POST')
		expect(response.value.payload.args[1].body).toBeInstanceOf(FormData)
	})

	test('Basic GET w/ headers & form urlencoded', () => {
		const gen = doFetch({
			path: 'http://www.google.com',
			method: 'POST',
			body: 'foo=bar&baz=quux',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		})
		const response = gen.next()
		expect(response.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: 'foo=bar&baz=quux',
			},
		])
	})

	test('Basic GET test non-empty JSON response from server', () => {
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const response = {
			ok: true,
			status: 200,
			headers: { has: () => true, get: () => 'application/json; charset=utf-8' },
			json: () => ({ foo: 'bar' }),
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value.payload.fn()).toEqual({ foo: 'bar' })
		const sagaDone = gen.next(response.json())
		expect(sagaDone.value).toEqual({
			ok: true,
			status: 200,
			data: {
				foo: 'bar',
			},
		})
		expect(sagaDone.done).toEqual(true)
	})

	test('Basic GET test non-empty Text response from server', () => {
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const response = {
			ok: true,
			status: 200,
			headers: { has: () => true, get: () => 'text/plain' },
			text: () => 'bar',
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value.payload.fn()).toEqual('bar')
		const sagaDone = gen.next(response.text())
		expect(sagaDone.value).toEqual({
			ok: true,
			status: 200,
			data: 'bar',
		})
		expect(sagaDone.done).toEqual(true)
	})

	test('Basic GET test empty response from server', () => {
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})

	test('Basic GET JSON error response from server', () => {
		const gen = doFetch({ path: 'http://www.google.com' })
		const callFetchEffect = gen.next()
		const response = {
			ok: false,
			status: 400,
			statusText: 'Bad Request',
			headers: { has: () => true, get: () => 'application/json; charset=utf-8' },
			json: () => ({ message: 'Bad Request: reasons' }),
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value.payload.fn()).toEqual({
			message: 'Bad Request: reasons',
		})
		const sagaDone = gen.next(response.json())
		expect(sagaDone.value).toEqual({
			ok: false,
			status: 400,
			data: {
				title: 'Error',
				message: 'Bad Request: reasons',
				code: 400,
			},
		})
		expect(sagaDone.done).toEqual(true)
	})

	test('PUT JSON with 204 response', () => {
		const putBody = { foo: 'bar', baz: 'quux' }
		const gen = doFetch({ path: 'http://www.google.com', method: 'PUT', body: putBody })
		const callFetchEffect = gen.next()
		expect(callFetchEffect.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
				body: JSON.stringify(putBody),
			},
		])
		const response = {
			ok: true,
			status: 204,
			statusText: 'NoContent',
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value).toEqual({
			ok: true,
			status: 204,
			data: putBody,
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})

	test('PUT Text content with 204 response', () => {
		const putBody = 'something'
		const gen = doFetch({
			path: 'http://www.google.com',
			method: 'PUT',
			body: putBody,
			headers: {
				'Content-Type': 'text/plain',
			},
		})
		const callFetchEffect = gen.next()
		expect(callFetchEffect.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'PUT',
				headers: {
					'Content-Type': 'text/plain',
				},
				body: putBody,
			},
		])
		const response = {
			ok: true,
			status: 204,
			statusText: 'NoContent',
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value).toEqual({
			ok: true,
			status: 204,
			data: undefined,
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})

	test('DELETE with 204 response', () => {
		const gen = doFetch({ path: 'http://www.google.com', method: 'DELETE' })
		const callFetchEffect = gen.next()
		expect(callFetchEffect.value.payload.args).toEqual([
			'http://www.google.com',
			{
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
				},
			},
		])
		const response = {
			ok: true,
			status: 204,
			statusText: 'NoContent',
		}
		const callResponseJsonEffect = gen.next(response)
		expect(callResponseJsonEffect.value).toEqual({
			ok: true,
			status: 204,
			data: undefined,
		})
		const sagaDone = gen.next()
		expect(sagaDone.value).toEqual(undefined)
		expect(sagaDone.done).toEqual(true)
	})
})
