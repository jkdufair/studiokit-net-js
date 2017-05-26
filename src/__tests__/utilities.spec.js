import byString from '../utilities'
import { describe, it } from 'mocha'
import { expect } from 'chai'

describe('Utilities', () => {
	it('Should locate an object by key', () => {
		const obj = byString({ foo: { bar: { baz: 'quux' } } }, 'foo.bar')
		expect(obj).to.deep.equal({ baz: 'quux' })
	})

	it('Should return the entire object if the path is not found', () => {
		const srcObj = { foo: { bar: { baz: 'quux' } } }
		const f = () => byString(srcObj, 'none.of.these')
		expect(f).to.throw(Error, /Key .+ not found in object/)
	})

	it('Should return the correct object even with a leading dot', () => {
		const obj = byString({ foo: 'bar' }, '.foo')
		expect(obj).to.equal('bar')
	})
})
