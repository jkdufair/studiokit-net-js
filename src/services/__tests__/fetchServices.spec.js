import rewire from 'rewire'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('Fetch middleware', () => {
})

describe('Path construction', () => {
	const app = rewire('../fetchService.js')
	const constructPath = app.__get__('constructPath')
	it('Should not add a question mark to a path without query params', () => {
		const path = constructPath({ path: 'http://abc.xyz/api/foo' })
		expect(path).to.equal('http://abc.xyz/api/foo')
	})

	it('Should add a single query param', () => {
		const path = constructPath({ path: 'http://abc.xyz/api/foo', queryParams: {
			bar: 'baz'
		}})
		expect(path).to.equal('http://abc.xyz/api/foo?bar=baz')
	})

	it('Should add mulitple query params', () => {
		const path = constructPath({ path: 'http://abc.xyz/api/foo', queryParams: {
			bar: 'baz',
			quux: 'wawa'
		}})
		expect(path).to.equal('http://abc.xyz/api/foo?bar=baz&quux=wawa')
	})

	it('Should encode params', () => {
		const path = constructPath({ path: 'http://abc.xyz/api/foo', queryParams: {
			bar: 'baz',
			'$foo': '/bar'
		}})
		expect(path).to.equal('http://abc.xyz/api/foo?bar=baz&%24foo=%2Fbar')
	})

	it('Should prepend baseUrl via config', () => {
		app.setApiRoot('http://abc.xyz')
		const path = constructPath({ path: '/api/foo' })
		expect(path).to.equal('http://abc.xyz/api/foo')
	})
})