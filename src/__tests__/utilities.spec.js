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
		const obj = byString(srcObj, 'none.of.these')
		expect(obj).to.deep.equal(srcObj)
	})

	it('Should return the entire object if the path is not found and the object is modified', () => {
		let srcObj = { foo: { bar: { baz: 'quux' } } }
		const obj = byString(srcObj, 'none.of.these')
		srcObj = { helter: 'skelter' }
		expect(obj).to.deep.equal({ foo: { bar: { baz: 'quux' } } })
	})

	it('Should return the correct object even with a leading dot', () => {
		const obj = byString({ foo: 'bar' }, '.foo')
		expect(obj).to.equal('bar')
	})
})
