import { fetchService } from '../fetchServices'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('Fetch middleware', () => {
	it('Should fetch from a public API', () => {
		const generator = fetchService({
			path: 'https://httpbin.org/get'
		})
		console.log(generator)
		console.log(generator.next())
		console.log(generator.next({json: () => {foo: 'bar'}}))
		console.log(generator.next())
	})
})