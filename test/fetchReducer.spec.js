import fetchReducer from '../src/fetchReducer'
import actions from '../src/actions'

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
				{ user: { foo: 'bar' } },
				{ type: actions.FETCH_REQUESTED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				user: { foo: 'bar', test: { isFetching: true, hasError: false, timedOut: false } }
			})
		})

		test('should preserve data and fetchedAt key while fetching', () => {
			const fetchedDate = new Date()

			const state = fetchReducer(
				{
					test: {
						data: { foo: 'bar' },
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedDate
					}
				},
				{ type: actions.FETCH_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({
				test: {
					data: { foo: 'bar' },
					isFetching: true,
					hasError: false,
					timedOut: false,
					fetchedAt: fetchedDate
				}
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

		test('nested add sibling key', () => {
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

		test('nested level replace existing key', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{
					user: {
						test: { key: 'oldValue' }
					}
				},
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

		test('nested level merge existing key', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{
					user: {
						existingKey: { foo: 'bar' }
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'user.test',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				user: {
					existingKey: { foo: 'bar' },
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

		test('nested level replace existing data on same key', () => {
			// makes sure "data" key gets completely replaced and not merged
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{
					user: {
						test: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate,
							data: { key: 'value', key2: 'value2' }
						}
					}
				},
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

		test('collection nested level replace existing data on same key', () => {
			// makes sure "data" key gets completely replaced and not merged
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{
					groups: {
						data: {
							1: {
								isFetching: false,
								hasError: false,
								timedOut: false,
								fetchedAt: fetchedAtDate,
								data: { key: 'value', key2: 'value2' }
							}
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'groups.data.1',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				groups: {
					data: {
						1: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate,
							data: { key: 'value' }
						}
					}
				}
			})
		})
	})

	describe('FETCH_FAILED', () => {
		test('single level', () => {
			const state = fetchReducer({}, { type: actions.FETCH_FAILED, modelName: 'test' })
			expect(state).toEqual({
				test: { isFetching: false, hasError: true, timedOut: false }
			})
		})

		test('single level, didTimeOut = true', () => {
			const state = fetchReducer(
				{},
				{ type: actions.FETCH_FAILED, modelName: 'test', didTimeOut: true }
			)
			expect(state).toEqual({
				test: { isFetching: false, hasError: true, timedOut: true }
			})
		})

		test('nested level', () => {
			const state = fetchReducer({}, { type: actions.FETCH_FAILED, modelName: 'user.test' })
			expect(state).toEqual({
				user: { test: { isFetching: false, hasError: true, timedOut: false } }
			})
		})

		test('nested level merge state', () => {
			const state = fetchReducer(
				{ foo: 'bar' },
				{ type: actions.FETCH_FAILED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: false, hasError: true, timedOut: false } }
			})
		})

		test('nested level replace state', () => {
			const state = fetchReducer(
				{ user: { foo: 'bar' } },
				{ type: actions.FETCH_FAILED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				user: { foo: 'bar', test: { isFetching: false, hasError: true, timedOut: false } }
			})
		})

		test('collection nested level replace state', () => {
			const fetchedAt = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAt)
			const state = fetchReducer(
				{
					groups: {
						data: {
							1: {
								data: { id: 1, foo: 'bar' },
								isFetching: true,
								hasError: false,
								timedOut: false,
								fetchedAt
							}
						}
					}
				},
				{ type: actions.FETCH_FAILED, modelName: 'groups.data.1' }
			)
			expect(state).toEqual({
				groups: {
					data: {
						1: {
							data: { id: 1, foo: 'bar' },
							isFetching: false,
							hasError: true,
							timedOut: false,
							fetchedAt
						}
					}
				}
			})
		})
	})

	describe('KEY_REMOVAL_REQUESTED', () => {
		test('remove key', () => {
			const state = fetchReducer(
				{ test: { foo: 'bar' } },
				{ type: actions.KEY_REMOVAL_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({})
		})

		test('remove key nested', () => {
			const state = fetchReducer(
				{ test: 'foo', test2: 'bar' },
				{ type: actions.KEY_REMOVAL_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({ test2: 'bar' })
		})

		test('remove key collection nested', () => {
			const state = fetchReducer(
				{ groups: { data: { 1: { data: { id: 1, name: 'group name' } } } } },
				{ type: actions.KEY_REMOVAL_REQUESTED, modelName: 'groups.data.1' }
			)
			expect(state).toEqual({ groups: { data: {} } })
		})
	})

	describe('Full lifecycle', () => {
		test('default flow', () => {
			const state = {}

			const state2 = fetchReducer(state, { type: actions.FETCH_REQUESTED, modelName: 'test' })
			expect(state2).toEqual({ test: { isFetching: true, hasError: false, timedOut: false } })

			const state3 = fetchReducer(state2, {
				type: actions.FETCH_RESULT_RECEIVED,
				modelName: 'test',
				data: { foo: 'bar' }
			})
			let fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			expect(state3).toEqual({
				test: {
					isFetching: false,
					hasError: false,
					timedOut: false,
					data: { foo: 'bar' },
					fetchedAt: fetchedAtDate
				}
			})

			fetchedAtDate = new Date()
			const state4 = fetchReducer(state3, {
				type: actions.FETCH_RESULT_RECEIVED,
				modelName: 'test',
				data: { baz: 'quux', bleb: 'fleb' }
			})
			expect(state4).toEqual({
				test: {
					isFetching: false,
					hasError: false,
					timedOut: false,
					data: { baz: 'quux', bleb: 'fleb' },
					fetchedAt: fetchedAtDate
				}
			})

			global.Date = _Date
		})
	})

	describe('default action', () => {
		test("don't do nada", () => {
			const state = fetchReducer({ test: 'foo' }, { type: 'FOOBAR', modelName: 'test' })
			expect(state).toEqual({ test: 'foo' })
		})

		test('no state parameter passed', () => {
			const state = fetchReducer(undefined, { type: actions.FETCH_REQUESTED, modelName: 'test' })
			expect(state).toEqual({ test: { isFetching: true, hasError: false, timedOut: false } })
		})
	})
})
