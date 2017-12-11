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
				test: {
					_metadata: {
						isFetching: true,
						hasError: false,
						lastFetchError: undefined,
						timedOut: false
					}
				}
			})
		})

		test('nested level', () => {
			const state = fetchReducer({}, { type: actions.FETCH_REQUESTED, modelName: 'user.test' })
			expect(state).toEqual({
				user: {
					test: {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined,
							timedOut: false
						}
					}
				}
			})
		})

		test('nested level with numbers', () => {
			const state = fetchReducer({}, { type: actions.FETCH_REQUESTED, modelName: 'user.1' })
			expect(state).toEqual({
				user: {
					'1': {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined,
							timedOut: false
						}
					}
				}
			})
		})

		test('nested level with multiple level numbers', () => {
			const state = fetchReducer({}, { type: actions.FETCH_REQUESTED, modelName: 'user.1.info.2' })
			expect(state).toEqual({
				user: {
					'1': {
						info: {
							'2': {
								_metadata: {
									isFetching: true,
									hasError: false,
									lastFetchError: undefined,
									timedOut: false
								}
							}
						}
					}
				}
			})
		})

		test('nested level merge state', () => {
			const state = fetchReducer(
				{ foo: 'bar' },
				{ type: actions.FETCH_REQUESTED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				foo: 'bar',
				user: {
					test: {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined,
							timedOut: false
						}
					}
				}
			})
		})

		test('nested level replace state', () => {
			const state = fetchReducer(
				{ user: { foo: 'bar' } },
				{ type: actions.FETCH_REQUESTED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				user: {
					foo: 'bar',
					test: {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined,
							timedOut: false
						}
					}
				}
			})
		})

		test('should preserve data and fetchedAt key while fetching', () => {
			const fetchedDate = new Date()

			const state = fetchReducer(
				{
					test: {
						foo: 'bar',
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedDate
						}
					}
				},
				{ type: actions.FETCH_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({
				test: {
					foo: 'bar',
					_metadata: {
						isFetching: true,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedDate
					}
				}
			})
		})

		test('should preserve data in nested level', () => {
			const fetchedDate = new Date()

			const state = fetchReducer(
				{
					test: {
						foo: {
							bar: 'baz'
						},
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedDate
						}
					}
				},
				{ type: actions.FETCH_REQUESTED, modelName: 'test.qux.1.corge' }
			)
			expect(state).toEqual({
				test: {
					foo: {
						bar: 'baz'
					},
					qux: {
						'1': {
							corge: {
								_metadata: {
									isFetching: true,
									hasError: false,
									timedOut: false,
									lastFetchError: undefined
								}
							}
						}
					},
					_metadata: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedDate
					}
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
					_metadata: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate
					},
					key: 'value'
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
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: 'value'
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
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: 'value'
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
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: 'value'
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
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: 'value'
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
							_metadata: {
								isFetching: false,
								hasError: false,
								timedOut: false,
								fetchedAt: fetchedAtDate
							},
							key: 'value',
							key2: 'value2'
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
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: 'value'
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
						1: {
							_metadata: {
								isFetching: false,
								hasError: false,
								timedOut: false,
								fetchedAt: fetchedAtDate
							},
							key: 'value',
							key2: 'value2'
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'groups.1',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				groups: {
					1: {
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: 'value'
					}
				}
			})
		})

		test('should preserve data in nested level', () => {
			const fetchedDate = new Date()

			const state = fetchReducer(
				{
					test: {
						foo: {
							bar: 'baz'
						},
						qux: {
							'1': {
								corge: {
									_metadata: {
										isFetching: true,
										hasError: false,
										timedOut: false,
										lastFetchError: undefined
									}
								}
							}
						},
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedDate
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'test.qux.1.corge',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				test: {
					foo: {
						bar: 'baz'
					},
					qux: {
						'1': {
							corge: {
								key: 'value',
								_metadata: {
									isFetching: false,
									hasError: false,
									timedOut: false,
									fetchedAt: fetchedDate
								}
							}
						}
					},
					_metadata: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedDate
					}
				}
			})
		})

		test('should convert the incoming data from arrays to object', () => {
			const fetchedDate = new Date()

			const state = fetchReducer(
				{
					test: {
						foo: {
							bar: 'baz'
						},
						qux: {
							'1': {
								corge: {
									'17': {
										_metadata: {
											isFetching: true,
											hasError: false,
											timedOut: false,
											lastFetchError: undefined
										}
									}
								}
							}
						},
						_metadata: {
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedDate
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'test.qux.1.corge.17',
					data: {
						test: [
							{
								foo: [
									{
										bar: '2',
										id: '112'
									}
								],
								id: '322'
							}
						],
						emptyObject: {},
						emptyArray: [],
						nonObjectArray: ['1', 2, 'bar'],
						nonIdObjects: [
							{
								val: 'a'
							},
							{
								val: 'b'
							},
							{
								val: 'b'
							}
						]
					}
				}
			)
			expect(state).toEqual({
				test: {
					foo: {
						bar: 'baz'
					},
					qux: {
						'1': {
							corge: {
								'17': {
									test: {
										'322': {
											foo: {
												'112': {
													bar: '2',
													id: '112'
												}
											},
											id: '322'
										}
									},
									emptyObject: {},
									emptyArray: {},
									nonObjectArray: ['1', 2, 'bar'],
									nonIdObjects: {
										'0': {
											val: 'a'
										},
										'1': {
											val: 'b'
										},
										'2': {
											val: 'b'
										}
									},
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
										lastFetchError: undefined,
										fetchedAt: fetchedDate
									}
								}
							}
						}
					},
					_metadata: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedDate
					}
				}
			})
		})

		test('handle string response', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			const state = fetchReducer(
				{},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'class',
					data: 'value'
				}
			)
			expect(state).toEqual({
				class: {
					_metadata: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate
					},
					response: 'value'
				}
			})
		})
	})

	describe('FETCH_FAILED', () => {
		test('single level with fetch error data', () => {
			const state = fetchReducer(
				{},
				{ type: actions.FETCH_FAILED, modelName: 'test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: false,
						hasError: true,
						lastFetchError: 'server fire',
						timedOut: false
					}
				}
			})
		})

		test('single level no fetch error data', () => {
			const state = fetchReducer({}, { type: actions.FETCH_FAILED, modelName: 'test' })
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: false,
						hasError: true,
						lastFetchError: undefined,
						timedOut: false
					}
				}
			})
		})

		test('single level, didTimeOut = true', () => {
			const state = fetchReducer(
				{},
				{ type: actions.FETCH_FAILED, modelName: 'test', didTimeOut: true }
			)
			expect(state).toEqual({
				test: { _metadata: { isFetching: false, hasError: true, timedOut: true } }
			})
		})

		test('nested level', () => {
			const state = fetchReducer(
				{},
				{ type: actions.FETCH_FAILED, modelName: 'user.test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				user: {
					test: {
						_metadata: {
							isFetching: false,
							hasError: true,
							lastFetchError: 'server fire',
							timedOut: false
						}
					}
				}
			})
		})

		test('nested level merge state', () => {
			const state = fetchReducer(
				{ foo: 'bar' },
				{ type: actions.FETCH_FAILED, modelName: 'user.test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				foo: 'bar',
				user: {
					test: {
						_metadata: {
							isFetching: false,
							hasError: true,
							lastFetchError: 'server fire',
							timedOut: false
						}
					}
				}
			})
		})

		test('nested level replace state', () => {
			const state = fetchReducer(
				{ user: { foo: 'bar' } },
				{ type: actions.FETCH_FAILED, modelName: 'user.test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				user: {
					foo: 'bar',
					test: {
						_metadata: {
							isFetching: false,
							hasError: true,
							lastFetchError: 'server fire',
							timedOut: false
						}
					}
				}
			})
		})

		test('collection nested level replace state', () => {
			const fetchedAt = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAt)
			const state = fetchReducer(
				{
					groups: {
						1: {
							id: 1,
							foo: 'bar',
							_metadata: {
								isFetching: true,
								hasError: false,
								timedOut: false,
								fetchedAt
							}
						}
					}
				},
				{ type: actions.FETCH_FAILED, modelName: 'groups.1', errorData: 'server fire' }
			)
			expect(state).toEqual({
				groups: {
					1: {
						id: 1,
						foo: 'bar',
						_metadata: {
							isFetching: false,
							hasError: true,
							lastFetchError: 'server fire',
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
				{ test: { foo: 'bar' }, test2: { baz: 'bat' } },
				{ type: actions.KEY_REMOVAL_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({ test2: { baz: 'bat' } })
		})

		test('remove key collection nested', () => {
			const state = fetchReducer(
				{ groups: { 1: { id: 1, name: 'group name' } } },
				{ type: actions.KEY_REMOVAL_REQUESTED, modelName: 'groups.1' }
			)
			expect(state).toEqual({ groups: {} })
		})
	})

	describe('Full lifecycle', () => {
		test('default flow', () => {
			const state = {}

			const state2 = fetchReducer(state, { type: actions.FETCH_REQUESTED, modelName: 'test' })
			expect(state2).toEqual({
				test: {
					_metadata: {
						isFetching: true,
						hasError: false,
						lastFetchError: undefined,
						timedOut: false
					}
				}
			})

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
					_metadata: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate
					},
					foo: 'bar'
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
					_metadata: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate
					},
					baz: 'quux',
					bleb: 'fleb'
				}
			})

			global.Date = _Date
		})
	})

	describe('default action', () => {
		test("don't do nada", () => {
			const state = fetchReducer({ test: { foo: 'bar' } }, { type: 'FOOBAR', modelName: 'test' })
			expect(state).toEqual({ test: { foo: 'bar' } })
		})

		test('no state parameter passed', () => {
			const state = fetchReducer(undefined, { type: actions.FETCH_REQUESTED, modelName: 'test' })
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: true,
						hasError: false,
						lastFetchError: undefined,
						timedOut: false
					}
				}
			})
		})
	})
})
