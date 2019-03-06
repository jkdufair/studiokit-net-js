import NET_ACTION, { createAction } from './actions'

describe('createAction', () => {
	it('creates a basic action', () => {
		const action = createAction(NET_ACTION.DATA_REQUESTED, { foo: 'bar' })
		expect(action).toEqual({ type: NET_ACTION.DATA_REQUESTED, foo: 'bar' })
	})
})
