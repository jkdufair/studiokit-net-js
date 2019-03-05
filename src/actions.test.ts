import { createAction } from './actions'

describe('createAction', () => {
	it('creates a basic action', () => {
		const action = createAction('aType', { foo: 'bar' })
		expect(action).toEqual({ type: 'aType', foo: 'bar' })
	})
})
