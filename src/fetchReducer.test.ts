import MockDate from 'mockdate'
import { NET_ACTION } from './actions'
import fetchReducer, { getMetadata, isCollection, mergeRelations } from './fetchReducer'

describe('supporting functions', () => {
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
					lastFetchError: undefined
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
					lastFetchError: undefined
				}
			}
			expect(isCollection(obj)).toEqual(false)
		})

		test('should return false for an empty object', () => {
			const obj = {}
			expect(isCollection(obj)).toEqual(false)
		})

		test('should return false for item with single relation that has id, but is not a collection', () => {
			expect(
				isCollection({
					child: {
						id: 1,
						foo: false
					}
				})
			).toEqual(false)
		})
	})

	describe('mergeRelations', () => {
		test('should succeed with empty objects', () => {
			const current = {}
			const incoming = {}
			expect(mergeRelations(current, incoming)).toEqual({})
		})

		test('should succeed if incoming is `undefined`', () => {
			const current = {}
			expect(mergeRelations(current, undefined)).toEqual({})
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

		test('should preserve child relation that has an id, but key is not the id', () => {
			const current = {
				child: {
					id: 1,
					foo: false
				}
			}
			const incoming = { id: 1, name: 'Bob' }
			expect(mergeRelations(current, incoming)).toEqual({
				child: {
					id: 1,
					foo: false
				}
			})
		})
	})
})

describe('fetchReducer', () => {
	test('Do nothing without action.modelName', () => {
		const state = fetchReducer(
			{ foo: 'bar' },
			{
				modelName: '',
				type: NET_ACTION.FETCH_RESULT_RECEIVED
			}
		)
		expect(state).toEqual({ foo: 'bar' })
	})

	describe('FETCH_REQUESTED', () => {
		test('single level', () => {
			const state = fetchReducer({}, { type: NET_ACTION.FETCH_REQUESTED, modelName: 'test' })
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: true,
						hasError: false,
						lastFetchError: undefined
					}
				}
			})
		})

		test('nested level', () => {
			const state = fetchReducer({}, { type: NET_ACTION.FETCH_REQUESTED, modelName: 'user.test' })
			expect(state).toEqual({
				user: {
					test: {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined
						}
					}
				}
			})
		})

		test('nested level with numbers', () => {
			const state = fetchReducer({}, { type: NET_ACTION.FETCH_REQUESTED, modelName: 'user.1' })
			expect(state).toEqual({
				user: {
					'1': {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined
						}
					}
				}
			})
		})

		test('nested level with multiple level numbers', () => {
			const state = fetchReducer({}, { type: NET_ACTION.FETCH_REQUESTED, modelName: 'user.1.info.2' })
			expect(state).toEqual({
				user: {
					'1': {
						info: {
							'2': {
								_metadata: {
									isFetching: true,
									hasError: false,
									lastFetchError: undefined
								}
							}
						}
					}
				}
			})
		})

		test('nested level merge state', () => {
			const state = fetchReducer({ foo: 'bar' }, { type: NET_ACTION.FETCH_REQUESTED, modelName: 'user.test' })
			expect(state).toEqual({
				foo: 'bar',
				user: {
					test: {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined
						}
					}
				}
			})
		})

		test('nested level replace state', () => {
			const state = fetchReducer(
				{ user: { foo: 'bar' } },
				{ type: NET_ACTION.FETCH_REQUESTED, modelName: 'user.test' }
			)
			expect(state).toEqual({
				user: {
					foo: 'bar',
					test: {
						_metadata: {
							isFetching: true,
							hasError: false,
							lastFetchError: undefined
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
							fetchedAt: fetchedDate
						}
					}
				},
				{ type: NET_ACTION.FETCH_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({
				test: {
					foo: 'bar',
					_metadata: {
						isFetching: true,
						hasError: false,
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

							fetchedAt: fetchedDate
						}
					}
				},
				{ type: NET_ACTION.FETCH_REQUESTED, modelName: 'test.qux.1.corge' }
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
									lastFetchError: undefined
								}
							}
						}
					},
					_metadata: {
						isFetching: false,
						hasError: false,
						fetchedAt: fetchedDate
					}
				}
			})
		})
	})

	describe('FETCH_RESULT_RECEIVED', () => {
		let fetchedAtDate: Date
		beforeEach(() => {
			fetchedAtDate = new Date()
			MockDate.set(fetchedAtDate)
		})

		test('single level', () => {
			const state = fetchReducer(
				{},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
					modelName: 'test',
					data: { key: 'value' }
				}
			)
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: false,
						hasError: false,
						fetchedAt: fetchedAtDate
					},
					key: 'value'
				}
			})
		})

		test('nested level', () => {
			const state = fetchReducer(
				{},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
							fetchedAt: fetchedAtDate
						},
						key: 'value'
					}
				}
			})
		})

		test('nested add sibling key', () => {
			const state = fetchReducer(
				{ foo: 'bar' },
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
							fetchedAt: fetchedAtDate
						},
						key: 'value'
					}
				}
			})
		})

		test('nested level replace existing key', () => {
			const state = fetchReducer(
				{
					user: {
						test: { key: 'oldValue' }
					}
				},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
							fetchedAt: fetchedAtDate
						},
						key: 'value'
					}
				}
			})
		})

		test('nested level merge existing key', () => {
			const state = fetchReducer(
				{
					user: {
						existingKey: { foo: 'bar' }
					}
				},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
							fetchedAt: fetchedAtDate
						},
						key: 'value'
					}
				}
			})
		})

		test('nested level replace existing data on same key', () => {
			// makes sure "data" key gets completely replaced and not merged
			const state = fetchReducer(
				{
					user: {
						test: {
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							},
							key: 'value',
							key2: 'value2'
						}
					}
				},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
							fetchedAt: fetchedAtDate
						},
						key: 'value'
					}
				}
			})
		})

		test('collection nested level replace existing data on same key', () => {
			// makes sure "data" key gets completely replaced and not merged
			const state = fetchReducer(
				{
					groups: {
						1: {
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							},
							key: 'value',
							key2: 'value2'
						}
					}
				},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
							fetchedAt: fetchedAtDate
						},
						key: 'value'
					}
				}
			})
		})

		test('should preserve data in nested level', () => {
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
										lastFetchError: undefined
									}
								}
							}
						},
						_metadata: {
							isFetching: false,
							hasError: false,
							fetchedAt: fetchedAtDate
						}
					}
				},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
									fetchedAt: fetchedAtDate
								}
							}
						}
					},
					_metadata: {
						isFetching: false,
						hasError: false,
						fetchedAt: fetchedAtDate
					}
				}
			})
		})

		test('should preserve nested collection relation that contains an id, but is not its key', () => {
			let state = {}
			state = fetchReducer(state, {
				type: NET_ACTION.FETCH_RESULT_RECEIVED,
				modelName: 'groups.1.child',
				data: { id: 1, foo: false }
			})
			expect(state).toEqual({
				groups: {
					1: {
						child: {
							id: 1,
							foo: false,
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							}
						}
					}
				}
			})
			state = fetchReducer(state, {
				type: NET_ACTION.FETCH_RESULT_RECEIVED,
				modelName: 'groups.1',
				data: { id: 1, name: 'Group 1' }
			})
			expect(state).toEqual({
				groups: {
					1: {
						id: 1,
						name: 'Group 1',
						child: {
							id: 1,
							foo: false,
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							}
						},
						_metadata: {
							isFetching: false,
							hasError: false,

							fetchedAt: fetchedAtDate
						}
					}
				}
			})
		})

		test('should remove nested collection key, if incoming is a collection and key is not included', () => {
			let state: any = {
				groups: {
					2: {
						child: {
							id: 2,
							foo: false,
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							}
						}
					}
				}
			}
			state = fetchReducer(state, {
				type: NET_ACTION.FETCH_RESULT_RECEIVED,
				modelName: 'groups.1.child',
				data: { id: 1, foo: false }
			})
			expect(state).toEqual({
				groups: {
					1: {
						child: {
							id: 1,
							foo: false,
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							}
						}
					},
					2: {
						child: {
							id: 2,
							foo: false,
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							}
						}
					}
				}
			})
			state = fetchReducer(state, {
				type: NET_ACTION.FETCH_RESULT_RECEIVED,
				modelName: 'groups',
				data: { 2: { id: 2, name: 'Group 2' } }
			})
			expect(state).toEqual({
				groups: {
					2: {
						id: 2,
						name: 'Group 2',
						child: {
							id: 2,
							foo: false,
							_metadata: {
								isFetching: false,
								hasError: false,
								fetchedAt: fetchedAtDate
							}
						}
					},
					_metadata: {
						isFetching: false,
						hasError: false,
						fetchedAt: fetchedAtDate
					}
				}
			})
		})

		test('handle string response', () => {
			const state = fetchReducer(
				{},
				{
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
					modelName: 'class',
					data: 'value'
				}
			)
			expect(state).toEqual({
				class: {
					_metadata: {
						isFetching: false,
						hasError: false,
						fetchedAt: fetchedAtDate
					},
					response: 'value'
				}
			})
		})

		test('any level preserve children', () => {
			const state = fetchReducer(
				{
					user: {
						testChildren: {
							_metadata: {
								isFetching: false,
								lastFetchError: undefined,
								hasError: false,
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
					type: NET_ACTION.FETCH_RESULT_RECEIVED,
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
	})

	describe('FETCH_FAILED', () => {
		test('single level with fetch error data', () => {
			const state = fetchReducer(
				{},
				{ type: NET_ACTION.FETCH_FAILED, modelName: 'test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: false,
						hasError: true,
						lastFetchError: 'server fire'
					}
				}
			})
		})

		test('single level no fetch error data', () => {
			const state = fetchReducer({}, { type: NET_ACTION.FETCH_FAILED, modelName: 'test' })
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: false,
						hasError: true,
						lastFetchError: undefined
					}
				}
			})
		})

		test('nested level', () => {
			const state = fetchReducer(
				{},
				{ type: NET_ACTION.FETCH_FAILED, modelName: 'user.test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				user: {
					test: {
						_metadata: {
							isFetching: false,
							hasError: true,
							lastFetchError: 'server fire'
						}
					}
				}
			})
		})

		test('nested level merge state', () => {
			const state = fetchReducer(
				{ foo: 'bar' },
				{ type: NET_ACTION.FETCH_FAILED, modelName: 'user.test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				foo: 'bar',
				user: {
					test: {
						_metadata: {
							isFetching: false,
							hasError: true,
							lastFetchError: 'server fire'
						}
					}
				}
			})
		})

		test('nested level replace state', () => {
			const state = fetchReducer(
				{ user: { foo: 'bar' } },
				{ type: NET_ACTION.FETCH_FAILED, modelName: 'user.test', errorData: 'server fire' }
			)
			expect(state).toEqual({
				user: {
					foo: 'bar',
					test: {
						_metadata: {
							isFetching: false,
							hasError: true,
							lastFetchError: 'server fire'
						}
					}
				}
			})
		})

		test('collection nested level replace state', () => {
			const fetchedAtDate = new Date()
			MockDate.set(fetchedAtDate)

			const state = fetchReducer(
				{
					groups: {
						1: {
							id: 1,
							foo: 'bar',
							_metadata: {
								isFetching: true,
								hasError: false,
								fetchedAt: fetchedAtDate
							}
						}
					}
				},
				{ type: NET_ACTION.FETCH_FAILED, modelName: 'groups.1', errorData: 'server fire' }
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
							fetchedAt: fetchedAtDate
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
				{ type: NET_ACTION.KEY_REMOVAL_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({})
		})

		test('remove key nested', () => {
			const state = fetchReducer(
				{ test: { foo: 'bar' }, test2: { baz: 'bat' } },
				{ type: NET_ACTION.KEY_REMOVAL_REQUESTED, modelName: 'test' }
			)
			expect(state).toEqual({ test2: { baz: 'bat' } })
		})

		test('remove key collection nested', () => {
			const state = fetchReducer(
				{ groups: { 1: { id: 1, name: 'group name' } } },
				{ type: NET_ACTION.KEY_REMOVAL_REQUESTED, modelName: 'groups.1' }
			)
			expect(state).toEqual({ groups: {} })
		})
	})

	describe('Full lifecycle', () => {
		test('default flow', () => {
			const state = {}

			const state2 = fetchReducer(state, { type: NET_ACTION.FETCH_REQUESTED, modelName: 'test' })
			expect(state2).toEqual({
				test: {
					_metadata: {
						isFetching: true,
						hasError: false,
						lastFetchError: undefined
					}
				}
			})

			const state3 = fetchReducer(state2, {
				type: NET_ACTION.FETCH_RESULT_RECEIVED,
				modelName: 'test',
				data: { foo: 'bar' }
			})
			let fetchedAtDate = new Date()
			MockDate.set(fetchedAtDate)
			expect(state3).toEqual({
				test: {
					_metadata: {
						isFetching: false,
						hasError: false,
						fetchedAt: fetchedAtDate
					},
					foo: 'bar'
				}
			})

			fetchedAtDate = new Date()
			const state4 = fetchReducer(state3, {
				type: NET_ACTION.FETCH_RESULT_RECEIVED,
				modelName: 'test',
				data: { baz: 'quux', bleb: 'fleb' }
			})
			expect(state4).toEqual({
				test: {
					_metadata: {
						isFetching: false,
						hasError: false,
						fetchedAt: fetchedAtDate
					},
					baz: 'quux',
					bleb: 'fleb'
				}
			})
		})
	})

	describe('default action', () => {
		test("don't do nada", () => {
			const state = fetchReducer({ test: { foo: 'bar' } }, { type: NET_ACTION.DATA_REQUESTED, modelName: 'test' })
			expect(state).toEqual({ test: { foo: 'bar' } })
		})

		test('no state parameter passed', () => {
			const state = fetchReducer(undefined, {
				type: NET_ACTION.FETCH_REQUESTED,
				modelName: 'test'
			})
			expect(state).toEqual({
				test: {
					_metadata: {
						isFetching: true,
						hasError: false,
						lastFetchError: undefined
					}
				}
			})
		})
	})
})
