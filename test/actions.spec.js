import { createAction } from '../lib/actions'

describe('Utilities', () => {
	test('Basic createAction', () => {
		const action = createAction('aType', { foo: 'bar' })
		expect(action).toEqual({ type: 'aType', foo: 'bar' })
	})
})
