import { setApiRoot, getApiRoot, __RewireAPI__ as FetchServiceRewireAPI } from '../fetchService'

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
