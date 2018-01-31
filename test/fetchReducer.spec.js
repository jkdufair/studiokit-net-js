import fetchReducer, { __RewireAPI__ as FetchReducerRewireAPI } from '../src/fetchReducer'
import actions from '../src/actions'
import _ from 'lodash'

const convertArraysToObjects = FetchReducerRewireAPI.__get__('convertArraysToObjects')
const getMetadata = FetchReducerRewireAPI.__get__('getMetadata')
const isCollection = FetchReducerRewireAPI.__get__('isCollection')
const mergeRelations = FetchReducerRewireAPI.__get__('mergeRelations')

describe('supporting functions', () => {
	describe('convertArraysToObject', () => {
		test('should not convert scalar', () => {
			const result = convertArraysToObjects('test')
			expect(result).toEqual('test')
		})

		test('should convert array to object', () => {
			const result = convertArraysToObjects([])
			expect(result).toEqual({})
		})

		test('should convert empty array prop to empty object prop', () => {
			const result = convertArraysToObjects({ arr: [] })
			expect(result).toEqual({ arr: {} })
		})

		test('should convert array to dictionary style object prop', () => {
			let obj = [
				{
					id: 1,
					name: 'Alton Brown',
					unitaskers: [{ id: 1, function: 'garlic peeler' }, { id: 2, function: 'herb scissors' }]
				}
			]
			const result = convertArraysToObjects(obj)
			expect(result).toEqual({
				1: {
					id: 1,
					name: 'Alton Brown',
					unitaskers: {
						1: {
							id: 1,
							function: 'garlic peeler'
						},
						2: {
							id: 2,
							function: 'herb scissors'
						}
					}
				}
			})
		})

		test('should convert object with array prop to dictionary style object prop', () => {
			let obj = {
				id: 1,
				name: 'Alton Brown',
				unitaskers: [{ id: 1, function: 'garlic peeler' }, { id: 2, function: 'herb scissors' }]
			}
			const result = convertArraysToObjects(obj)
			expect(result).toEqual({
				id: 1,
				name: 'Alton Brown',
				unitaskers: {
					1: {
						id: 1,
						function: 'garlic peeler'
					},
					2: {
						id: 2,
						function: 'herb scissors'
					}
				}
			})
		})

		test('should return same object when no array props present', () => {
			let obj = { id: 1, name: 'Alton Brown' }
			const result = convertArraysToObjects(obj)
			expect(result).toEqual(obj)
		})

		test('should return same object when no array props present', () => {
			let obj = {
				id: 1,
				name: 'Alton Brown',
				unitaskers: {
					1: {
						id: 1,
						function: 'garlic peeler'
					},
					2: {
						id: 2,
						function: 'herb scissors'
					}
				}
			}
			const result = convertArraysToObjects(obj)
			expect(result).toEqual(obj)
		})
	})

	describe('getMetadata', () => {
		test('can get metadata entity', () => {
			const state = { foo: { bar: 'bar', _metadata: { baz: 'quux' } } }
			expect(getMetadata(state, ['foo'])).toEqual({ baz: 'quux' })
		})

		test('should return empty object for no metadata', () => {
			const state = { foo: { bar: 'bar' } }
			expect(getMetadata(state, ['foo'])).toEqual({})
		})

		test('should return empty object for nonexistent path', () => {
			const state = { foo: { bar: 'bar' } }
			expect(getMetadata(state, ['nada'])).toEqual({})
		})
	})

	describe('isCollection', () => {
		test('should return true for a collection obj', () => {
			const obj = {
				1: {
					id: 1
				},
				2: {
					id: 2
				}
			}
			expect(isCollection(obj)).toEqual(true)
		})

		test('should return true for a collection obj with _metadata', () => {
			const obj = {
				1: {
					id: 1
				},
				2: {
					id: 2
				},
				_metadata: {
					isFetching: false,
					hasError: false,
					lastFetchError: undefined,
					timedOut: false
				}
			}
			expect(isCollection(obj)).toEqual(true)
		})

		test('should return false for a collection array', () => {
			const obj = [
				{
					id: 1
				},
				{
					id: 2
				}
			]
			expect(isCollection(obj)).toEqual(false)
		})

		test('should return false for a non collection', () => {
			const obj = {
				foo: 'bar',
				baz: { quux: 7 },
				bleb: 4,
				boop: [1, 2, { three: 4 }],
				_metadata: {
					isFetching: false,
					hasError: false,
					lastFetchError: undefined,
					timedOut: false
				}
			}
			expect(isCollection(obj)).toEqual(false)
		})

		test('should return false for an empty object', () => {
			const obj = {}
			expect(isCollection(obj)).toEqual(false)
		})
	})

	describe('mergeRelations', () => {
		test('should succeed with empty objects', () => {
			const current = {}
			const incoming = {}
			expect(mergeRelations(current, incoming)).toEqual({})
		})

		test('should return objects without non-relations', () => {
			const current = { foo: 'bar' }
			const incoming = { foo: 'bar' }
			expect(mergeRelations(current, incoming)).toEqual({})
		})

		test('should remove collection items not included in incoming array', () => {
			const current = { 1: { id: 1, child: { foo: 'bar' } }, 2: { id: 2 } }
			const incoming = { 1: { id: 1 } }
			expect(mergeRelations(current, incoming)).toEqual({ 1: { child: { foo: 'bar' } } })
		})

		test('should remove nested collection items not included in incoming array', () => {
			const current = {
				1: { id: 1, children: { 1: { id: 1, foo: 'bar' }, 2: { id: 2, boo: 'bah' } } }
			}
			const incoming = { 1: { id: 1, children: { 2: { id: 2 } } } }
			expect(mergeRelations(current, incoming)).toEqual({
				1: { children: { 2: {} } }
			})
		})

		test('should preserve non-collection relations', () => {
			const current = { child: { foo: 'bar' } }
			const incoming = {}
			expect(mergeRelations(current, incoming)).toEqual({ child: { foo: 'bar' } })
		})
	})
})

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
									],
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

		test('any level preserve children', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			let state = fetchReducer(
				{
					user: {
						testChildren: {
							_metadata: {
								isFetching: false,
								lastFetchError: undefined,
								hasError: false,
								timedOut: false,
								fetchedAt: fetchedAtDate
							},
							key: 'value',
							child1: [1, 2, 3],
							child2: {
								eeny: 'meeny',
								miney: 'mo'
							}
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'user.testChildren',
					data: {
						key: 'new value'
					}
				}
			)
			expect(state).toEqual({
				user: {
					testChildren: {
						_metadata: {
							isFetching: false,
							lastFetchError: undefined,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: 'new value',
						child1: [1, 2, 3],
						child2: {
							eeny: 'meeny',
							miney: 'mo'
						}
					}
				}
			})
		})

		test('should convert arrays to objects from request', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			let state = fetchReducer(
				{
					user: {
						testChildrenWithArraysOfObjects: {
							_metadata: {
								isFetching: false,
								lastFetchError: undefined,
								hasError: false,
								timedOut: false,
								fetchedAt: fetchedAtDate
							},
							key: 'value',
							child1: [1, 2, 3],
							child2: {
								eeny: 'meeny',
								miney: 'mo'
							}
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'user.testChildrenWithArraysOfObjects',
					data: {
						key: [{ id: 1, name: 'Alton' }, { id: 2, name: 'Giada' }]
					}
				}
			)
			expect(state).toEqual({
				user: {
					testChildrenWithArraysOfObjects: {
						_metadata: {
							isFetching: false,
							lastFetchError: undefined,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						},
						key: {
							'1': { id: 1, name: 'Alton' },
							'2': { id: 2, name: 'Giada' }
						},
						child1: [1, 2, 3],
						child2: {
							eeny: 'meeny',
							miney: 'mo'
						}
					}
				}
			})
		})

		test('remove non-scalars by key if response is an array and key is not included', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			let state = fetchReducer(
				{
					groups: {
						'1': {
							id: 1,
							name: 'Group 1',
							members: {
								'1': { id: 1, name: 'Alton' },
								'2': {
									id: 2,
									name: 'Giada',
									child1: [1, 2, 3],
									relations: {
										'1': {
											id: 1
										}
									}
								}
							}
						},
						'21': {
							id: 2,
							name: 'Group 2',
							members: {
								'3': { id: 3, name: 'Jim' },
								'4': { id: 4, name: 'Bob' }
							}
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'groups.1.members',
					data: [{ id: 2, name: 'Giada' }]
				}
			)
			expect(state).toEqual({
				groups: {
					'1': {
						id: 1,
						name: 'Group 1',
						members: {
							'2': {
								id: 2,
								name: 'Giada',
								child1: [1, 2, 3],
								relations: {
									'1': {
										id: 1
									}
								}
							},
							_metadata: {
								isFetching: false,
								lastFetchError: undefined,
								hasError: false,
								timedOut: false,
								fetchedAt: fetchedAtDate
							}
						}
					},
					'21': {
						id: 2,
						name: 'Group 2',
						members: {
							'3': { id: 3, name: 'Jim' },
							'4': { id: 4, name: 'Bob' }
						}
					}
				}
			})
		})

		test('remove nested non-scalars by key if response is an array and key is not included', () => {
			const fetchedAtDate = new Date()
			const _Date = Date
			global.Date = jest.fn(() => fetchedAtDate)
			let state = fetchReducer(
				{
					parents: {
						'1': {
							id: 1,
							name: 'Parent 1',
							children: {
								'1': { id: 1, name: 'Alton' },
								'2': {
									id: 2,
									name: 'Giada',
									child1: [1, 2, 3],
									relations: {
										'1': {
											id: 1
										}
									}
								}
							}
						}
					}
				},
				{
					type: actions.FETCH_RESULT_RECEIVED,
					modelName: 'parents.1',
					data: {
						id: 1,
						name: 'Parent 1',
						children: [
							{
								id: 2,
								name: 'Giada'
							}
						]
					}
				}
			)
			expect(state).toEqual({
				parents: {
					'1': {
						id: 1,
						name: 'Parent 1',
						children: {
							'2': {
								id: 2,
								name: 'Giada',
								child1: [1, 2, 3],
								relations: {
									'1': {
										id: 1
									}
								}
							}
						},
						_metadata: {
							isFetching: false,
							lastFetchError: undefined,
							hasError: false,
							timedOut: false,
							fetchedAt: fetchedAtDate
						}
					}
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
