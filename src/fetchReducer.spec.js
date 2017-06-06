import fetchReducer from './fetchReducer'
import actions from './actions'

describe('fetchReducer', () => {
	test('Do nothing without action.modelName', () => {
		const state = fetchReducer({ foo: 'bar' }, {})
		expect(state).toEqual({ foo: 'bar' })
	})

	describe('FETCH_REQUESTED', () => {
		test('single level', () => {
			const state = fetchReducer({}, { type: actions.FETCH_REQUESTED, modelName: 'test' })
			expect(state).toEqual({
				test: { isFetching: true, hasError: false, timedOut: false }
			})
		})

		test('nested level', () => {
			const state = fetchReducer({}, { type: actions.FETCH_REQUESTED, modelName: 'user.test' })
			expect(state).toEqual({
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			})
		})

		test('nested level merge state', () => {
			const state = fetchReducer(
				{ foo: 'bar' },
				{ type: actions.FETCH_REQUESTED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			})
		})

		test('nested level replace state', () => {
			const state = fetchReducer(
				{ user: 'bar' },
				{ type: actions.FETCH_REQUESTED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			})
		})
	})

	describe('FETCH_RESULT_RECEIVED', () => {
		test('single level', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'test',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				test: {
					isFetching: false,
					hasError: false,
					timedOut: false,
					fetchedAt: fetchedAtDate,
					data: { key: 'value' }
				}
			})
			global.Date = _Date
		})

		test('nested level', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'user.test',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value' }
					}
				}
			})
		})

		test('nested level merge state', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{ foo: 'bar' },
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'user.test',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				foo: 'bar',
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value' }
					}
				}
			})
		})

		test('nested level replace state', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{ user: 'bar' },
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'user.test',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value' }
					}
				}
			})
		})
	})
})
