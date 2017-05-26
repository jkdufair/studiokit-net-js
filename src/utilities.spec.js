import byString from './utilities'

describe('Utilities', () => {
	test('Should locate an object by key', () => {
		const obj = byString({ foo: { bar: { baz: 'quux' } } }, 'foo.bar')
		expect(obj).toEqual({ baz: 'quux' })
	})

	test('Should return the entire object if the path is not found', () => {
		const srcObj = { foo: { bar: { baz: 'quux' } } }
		const f = () => byString(srcObj, 'none.of.these')
		expect(f).toThrowError(/Key .+ not found in object/)
	})

	test('Should return the correct object even with a leading dot', () => {
		const obj = byString({ foo: 'bar' }, '.foo')
		expect(obj).toEqual('bar')
	})
})
