import { call, cancel, cancelled, takeEvery, takeLatest, fork, put, delay } from 'redux-saga/effects'
import { createMockTask } from '@redux-saga/testing-utils'
import uuid from 'uuid'
import MockDate from 'mockdate'
import NET_ACTION, { createAction } from './actions'
import { OAuthToken } from './types'
import { doFetch } from './fetchService'
import fetchSaga, {
	fetchData,
	fetchOnce,
	fetchDataRecurring,
	fetchDataLoop,
	getState,
	matchesTerminationAction,
	takeMatchesTerminationAction,
	prepareFetch
} from './fetchSaga'

let consoleOutput: any
const consoleDebug = console.debug

beforeAll(() => {
	console.debug = jest.fn(message => {
		consoleOutput = message
	})
})

afterAll(() => {
	console.debug = consoleDebug
})

const getOauthToken = (): OAuthToken => {
	return {
		access_token: 'some-access-token',
		refresh_token: 'some-refresh-token',
		client_id: 'web',
		token_type: 'Bearer',
		expires_in: 3600,
		'.expires': '2019-01-02',
		'.issued': '2019-01-01'
	}
}

describe('fetchSaga', () => {
	test('should set up all takes', () => {
		const gen = fetchSaga({})

		const takeEveryDataRequestEffect = gen.next()
		expect(takeEveryDataRequestEffect.value).toEqual(takeEvery(NET_ACTION.DATA_REQUESTED, fetchOnce))
		const takeEveryPeriodicDataRequestEffect = gen.next()
		expect(takeEveryPeriodicDataRequestEffect.value).toEqual(
			takeEvery(NET_ACTION.PERIODIC_DATA_REQUESTED, fetchDataRecurring)
		)
		const takeLatestDataRequestedEffect = gen.next()
		expect(takeLatestDataRequestedEffect.value).toEqual(takeLatest(NET_ACTION.DATA_REQUESTED_USE_LATEST, fetchOnce))
	})

	test('should use default logger', () => {
		const gen = fetchSaga({ test: { _config: { fetch: { path: '/foo' } } } }, '')
		gen.next()
		expect(consoleOutput).toEqual('logger set to defaultLogger')
	})

	test('should use custom logger', () => {
		let customOutput: string = ''
		const customLogger = (message: string) => {
			customOutput = message
		}
		const gen = fetchSaga(
			{ test: { _config: { fetch: { path: '/foo' } } } },
			'',
			undefined,
			undefined,
			customLogger
		)
		gen.next()
		expect(customOutput).toEqual('logger set to customLogger')
	})
})

describe('prepareFetch', () => {
	test('should populate id params for multi-level collection paths', () => {
		const result = prepareFetch(
			{
				_config: {
					fetch: {
						path: '/api/foo/{:id}/bar/{:id}/baz'
					},
					isCollection: true
				}
			},
			{ type: NET_ACTION.DATA_REQUESTED, modelName: 'foo.bar.baz', pathParams: [1, 2] },
			{
				foo: {
					_config: {
						isCollection: true
					},
					bar: {
						_config: {
							isCollection: true
						},
						baz: {
							_config: {
								isCollection: true
							}
						}
					}
				}
			}
		)
		expect(result.fetchConfig.path).toEqual('/api/foo/1/bar/2/baz')
	})
	test('should populate id params for collection nested under non-collections', () => {
		const result = prepareFetch(
			{
				_config: {
					isCollection: true
				}
			},
			{ type: NET_ACTION.DATA_REQUESTED, modelName: 'foo.bar.baz', pathParams: [1] },
			{
				foo: {
					bar: {
						baz: {
							_config: {
								isCollection: true
							}
						}
					}
				}
			}
		)
		expect(result.fetchConfig.path).toEqual('/api/foo/bar/baz/1')
	})
	test('should populate id params for collection nested under non-collections and honor empty fetch paths', () => {
		const result = prepareFetch(
			{
				_config: {
					isCollection: true
				}
			},
			{ type: NET_ACTION.DATA_REQUESTED, modelName: 'foo.bar.baz', pathParams: [1] },
			{
				foo: {
					_config: {
						fetch: {
							path: ''
						}
					},
					bar: {
						_config: {
							fetch: {
								path: '/api/bar'
							},
							isCollection: true
						},
						baz: {
							_config: {
								isCollection: true
							}
						}
					}
				}
			}
		)
		expect(result).toEqual({
			fetchConfig: {
				headers: {},
				path: '/api/bar/1/baz',
				queryParams: {}
			},
			isCollectionItemCreate: false,
			isCollectionItemFetch: false,
			isUrlValid: true,
			endpointConfig: {
				isCollection: true
			},
			modelName: 'foo.bar.1.baz'
		})
	})
	// tslint:disable-next-line
	test('should use absolute path for non-collection under collection with absolute path, and not append pathParams to path', () => {
		const result = prepareFetch(
			{
				_config: {
					fetch: {
						path: '/api/bar'
					}
				}
			},
			{ type: NET_ACTION.DATA_REQUESTED, modelName: 'foo.bar', pathParams: [1] },
			{
				foo: {
					_config: {
						isCollection: true,
						fetch: {
							path: '/api/foo'
						}
					},
					bar: {
						_config: {
							fetch: {
								path: '/api/bar'
							}
						}
					}
				}
			}
		)
		expect(result).toEqual({
			fetchConfig: {
				headers: {},
				path: '/api/bar',
				queryParams: {}
			},
			isCollectionItemCreate: false,
			isCollectionItemFetch: false,
			isUrlValid: true,
			endpointConfig: {
				fetch: {
					path: '/api/bar'
				}
			},
			modelName: 'foo.1.bar'
		})
	})
	// tslint:disable-next-line
	test('should use absolute path for collection under collection with absolute path, and exclude first pathParam from path', () => {
		const result = prepareFetch(
			{
				_config: {
					isCollection: true,
					fetch: {
						path: '/api/bar'
					}
				}
			},
			{ type: NET_ACTION.DATA_REQUESTED, modelName: 'foo.bar', pathParams: [1, 2] },
			{
				foo: {
					_config: {
						isCollection: true,
						fetch: {
							path: '/api/foo'
						}
					},
					bar: {
						_config: {
							isCollection: true,
							fetch: {
								path: '/api/bar'
							}
						}
					}
				}
			}
		)
		expect(result).toEqual({
			fetchConfig: {
				headers: {},
				path: '/api/bar/2',
				queryParams: {}
			},
			isCollectionItemCreate: false,
			isCollectionItemFetch: true,
			isUrlValid: true,
			endpointConfig: {
				isCollection: true,
				fetch: {
					path: '/api/bar'
				}
			},
			modelName: 'foo.1.bar.2'
		})
	})
	// tslint:disable-next-line
	test('should use absolute path for two nested collections under collection with absolute path, and exclude correct pathParams from path', () => {
		const result = prepareFetch(
			{
				_config: {
					isCollection: true
				}
			},
			{ type: NET_ACTION.DATA_REQUESTED, modelName: 'foo.bar.baz', pathParams: [1, 2, 3] },
			{
				foo: {
					_config: {
						isCollection: true,
						fetch: {
							path: '/api/foo'
						}
					},
					bar: {
						_config: {
							isCollection: true,
							fetch: {
								path: '/api/bar'
							}
						},
						baz: {
							_config: {
								isCollection: true
							}
						}
					}
				}
			}
		)
		expect(result).toEqual({
			fetchConfig: {
				headers: {},
				path: '/api/bar/2/baz/3',
				queryParams: {}
			},
			isCollectionItemCreate: false,
			isCollectionItemFetch: true,
			isUrlValid: true,
			endpointConfig: {
				isCollection: true
			},
			modelName: 'foo.1.bar.2.baz.3'
		})
	})
})

describe('fetchData', () => {
	let errorOutput: string | null
	beforeAll(() => {
		const fetchSagaGen = fetchSaga(
			{
				test: {
					_config: {
						fetch: {
							path: 'http://www.google.com'
						}
					}
				},
				test2: {
					_config: {
						fetch: {
							path: 'http://news.ycombinator.com',
							body: 'string'
						}
					}
				},
				test3: {
					_config: {
						fetch: {
							path: 'http://news.ycombinator.com',
							body: { foo: 'bar' }
						}
					}
				},
				arrayBodyDefault: {
					_config: {
						fetch: {
							path: 'http://news.ycombinator.com',
							body: ['foo']
						}
					}
				},
				arrayBody: {
					_config: {
						fetch: {
							path: 'http://news.ycombinator.com'
						}
					}
				},
				test4: {
					_config: {
						fetch: {
							path: 'http://{{testServer}}'
						}
					}
				},
				test5: {
					_config: {
						fetch: {
							path: 'http://www.google.com/{:entityId}'
						}
					}
				},
				test6: {
					_config: {
						fetch: {
							path: 'http://{{testServer}}/{:entityId}'
						}
					}
				},
				entities: {
					_config: {
						fetch: {
							path: 'http://www.google.com/entities'
						},
						isCollection: true
					}
				},
				topLevelEntities: {
					_config: {
						fetch: {
							path: 'http://www.google.com/topLevelEntities'
						},
						isCollection: true
					},
					entityAction: {
						_config: {
							fetch: {
								path: 'entityAction',
								method: 'POST'
							}
						}
					},
					secondLevelEntities: {
						_config: {
							fetch: {
								path: 'secondLevelEntities'
							},
							isCollection: true
						},
						entityAction: {
							_config: {
								fetch: {
									path: 'entityAction'
								}
							}
						}
					}
				},
				topLevelEntitiesNoPath: {
					_config: {
						isCollection: true
					},
					entityAction: {
						_config: {
							fetch: {
								path: 'entityAction',
								method: 'POST'
							}
						}
					},
					secondLevelEntities: {
						_config: {
							isCollection: true
						},
						entityAction: {
							_config: {
								fetch: {
									path: 'entityAction'
								}
							}
						}
					}
				}
			},
			'http://google.com',
			getOauthToken, // this won't get called directly
			errorMessage => {
				errorOutput = errorMessage
			}
		)
		fetchSagaGen.next()
	})

	// NOTE: Keep in mind that if you pass a value to gen.next(), that is the value
	// that used to evaluate the previous `yield` call

	describe('before fetch', () => {
		test('should throw when action.modelName is undefined', () => {
			const gen = fetchData({ modelName: '', type: NET_ACTION.DATA_REQUESTED })
			expect(() => {
				const startGenerator = gen.next()
			}).toThrow(/modelName' config parameter is required for fetchData/)
		})

		test('should throw when action.modelName is not found in models', () => {
			const gen = fetchData({ modelName: 'foo', type: NET_ACTION.DATA_REQUESTED })
			expect(() => {
				const startGenerator = gen.next()
			}).toThrow(/Cannot find 'foo' in EndpointMappings/)
		})

		test('should use "action.method" if it is defined', () => {
			const gen = fetchData({
				modelName: 'test',
				method: 'POST',
				type: NET_ACTION.DATA_REQUESTED
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://www.google.com',
					headers: { Authorization: 'Bearer some-access-token' },
					method: 'POST',
					queryParams: {}
				})
			)
		})
		test('should replace baseConfig body as string if body is string', () => {
			const gen = fetchData({
				modelName: 'test2',
				type: NET_ACTION.DATA_REQUESTED,
				body: 'body'
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://news.ycombinator.com',
					contentType: 'application/x-www-form-urlencoded',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					body: 'body'
				})
			)
		})

		test('should merge body as JSON if body is JSON', () => {
			const gen = fetchData({
				modelName: 'test3',
				type: NET_ACTION.DATA_REQUESTED,
				body: { baz: 'quux' }
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://news.ycombinator.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					body: {
						foo: 'bar',
						baz: 'quux'
					}
				})
			)
		})

		test('should merge body as JSON Array if body is JSON, with default body', () => {
			const gen = fetchData({
				modelName: 'arrayBodyDefault',
				type: NET_ACTION.DATA_REQUESTED,
				body: ['bar']
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://news.ycombinator.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					body: ['foo', 'bar']
				})
			)
		})

		test('should send with default body', () => {
			const gen = fetchData({
				modelName: 'arrayBodyDefault',
				type: NET_ACTION.DATA_REQUESTED
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://news.ycombinator.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					body: ['foo']
				})
			)
		})

		test('should keep body as JSON Array if body is JSON', () => {
			const gen = fetchData({
				modelName: 'arrayBody',
				type: NET_ACTION.DATA_REQUESTED,
				body: ['bar']
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://news.ycombinator.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					body: ['bar']
				})
			)
		})

		test('should populate store parameter in path', () => {
			const gen = fetchData({ modelName: 'test4', type: NET_ACTION.DATA_REQUESTED })
			const selectEffect = gen.next()
			const putFetchRequestEffect = gen.next({ testServer: 'baz' })
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://baz',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should fail to populate store parameter in path if it is undefined', () => {
			const gen = fetchData({ modelName: 'test4', type: NET_ACTION.DATA_REQUESTED })
			const selectEffect = gen.next()
			// send empty store
			const putFetchRequestEffect = gen.next(getState())
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_FAILED, {
						modelName: 'test4',
						errorData: 'Invalid URL'
					})
				)
			)
			// trigger fetchData fn end
			gen.next()
		})

		test('should fail to populate store parameter in path if it is null', () => {
			const gen = fetchData({ modelName: 'test4', type: NET_ACTION.DATA_REQUESTED })
			const selectEffect = gen.next()
			// send store with null value
			const putFetchRequestEffect = gen.next({ testServer: null })
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_FAILED, {
						modelName: 'test4',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should populate basic parmater in path', () => {
			const gen = fetchData({
				modelName: 'test5',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [1]
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://www.google.com/1',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should fail to populate basic parameter in path if it is undefined', () => {
			const gen = fetchData({ modelName: 'test5', type: NET_ACTION.DATA_REQUESTED })
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_FAILED, {
						modelName: 'test5',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should fail to populate basic parameter in path if it is null', () => {
			const gen = fetchData({
				modelName: 'test5',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [null]
			})
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_FAILED, {
						modelName: 'test5',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should fail to populate basic parameter in path when "noStore" = true', () => {
			const gen = fetchData({
				modelName: 'test5',
				type: NET_ACTION.DATA_REQUESTED,
				noStore: true
			})
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(NET_ACTION.TRANSIENT_FETCH_FAILED, {
						modelName: 'test5',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should populate basic and store parameters in path', () => {
			const gen = fetchData({
				modelName: 'test6',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [1]
			})
			const selectEffect = gen.next()
			const putFetchRequestEffect = gen.next({ testServer: 'baz' })
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://baz/1',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should construct path from modelName for collections without paths, no pathParams', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath',
				type: NET_ACTION.DATA_REQUESTED
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: '/api/topLevelEntitiesNoPath',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should construct path from modelName for collections without paths, single level, with pathParams', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [1]
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: '/api/topLevelEntitiesNoPath/1',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should construct path from modelName for collections without paths, nested level, with pathParams', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath.secondLevelEntities',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [1]
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: '/api/topLevelEntitiesNoPath/1/secondLevelEntities',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should construct path from modelName for collection item action, single level, with pathParams', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath.entityAction',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [1]
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: '/api/topLevelEntitiesNoPath/1/entityAction',
					method: 'POST',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should construct path from modelName for collection item action, nested level, with pathParams', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath.secondLevelEntities.entityAction',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [1, 999]
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: '/api/topLevelEntitiesNoPath/1/secondLevelEntities/999/entityAction',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})

		test('should fail to populate basic parameter in path if it is undefined, for collection', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath',
				type: NET_ACTION.DATA_REQUESTED,
				pathParams: [undefined]
			})
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_FAILED, {
						modelName: 'topLevelEntitiesNoPath',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should emit FETCH_REQUESTED', () => {
			const gen = fetchData({ modelName: 'test', type: NET_ACTION.DATA_REQUESTED })
			const startGenerator = gen.next()
			expect(startGenerator.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_REQUESTED, {
						modelName: 'test'
					})
				)
			)
		})

		test('should add oauth token to header if it exists', () => {
			const gen = fetchData({ modelName: 'test', type: NET_ACTION.DATA_REQUESTED })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			expect(fetchEffect.value).toEqual(
				call(doFetch, {
					path: 'http://www.google.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				})
			)
		})
	})

	describe('successful fetch', () => {
		test('should execute basic fetch', () => {
			const gen = fetchData({ modelName: 'test', type: NET_ACTION.DATA_REQUESTED })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next()
			const resultReceivedEffect = gen.next({
				ok: true,
				status: 200,
				data: { foo: 'bar' }
			})
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
						data: { foo: 'bar' },
						modelName: 'test'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})

		test('should execute basic fetch with content-type', () => {
			const gen = fetchData({
				modelName: 'test',
				type: NET_ACTION.DATA_REQUESTED,
				contentType: 'text/html; charset=utf-8'
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next()
			const resultReceivedEffect = gen.next({
				ok: true,
				status: 200,
				data: { foo: 'bar' }
			})
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
						data: { foo: 'bar' },
						modelName: 'test'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})

		test('should execute basic transient fetch', () => {
			const gen = fetchData({
				modelName: 'test',
				type: NET_ACTION.DATA_REQUESTED,
				noStore: true
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			const resultReceivedEffect = gen.next({
				ok: true,
				status: 200,
				data: { foo: 'bar' }
			})
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED, {
						data: { foo: 'bar' },
						modelName: 'test'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})

		test('should return "guid" on fetchResult if passed in "action.guid"', () => {
			const guid = uuid.v4()
			const gen = fetchData({
				modelName: 'test',
				type: NET_ACTION.DATA_REQUESTED,
				method: 'POST',
				guid
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next()
			const resultReceivedEffect = gen.next({
				ok: true,
				status: 200,
				data: { foo: 'bar' }
			})
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
						data: { foo: 'bar', guid },
						guid,
						modelName: 'test'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})
	})

	describe('failed fetch', () => {
		test('should retry on fetch error title', () => {
			const gen = fetchData({ modelName: 'test', type: NET_ACTION.DATA_REQUESTED })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			const fetchTryFailedEffect = gen.next({ title: 'Error' })
			const putTryFailedEffect = gen.next()
			const delayAndPutAgainEffect = gen.next()
			expect(delayAndPutAgainEffect.value).toEqual(
				put(createAction(NET_ACTION.FETCH_REQUESTED, { modelName: 'test' }))
			)
		})

		test('should retry on fetch error code', () => {
			const gen = fetchData({ modelName: 'test', type: NET_ACTION.DATA_REQUESTED })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			const fetchTryFailedEffect = gen.next({ code: 500 })
			const putTryFailedEffect = gen.next()
			const delayAndPutAgainEffect = gen.next()
			expect(delayAndPutAgainEffect.value).toEqual(
				put(createAction(NET_ACTION.FETCH_REQUESTED, { modelName: 'test' }))
			)
		})

		test('should dispatch FETCH_FAILED when all retries have failed', () => {
			const gen = fetchData({ modelName: 'test', type: NET_ACTION.DATA_REQUESTED })
			const putFetchRequestEffect = gen.next()
			for (let i = 0; i <= 3; i++) {
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				const fetchTryFailedEffect = gen.next({
					ok: false,
					status: 500,
					data: { title: 'Error' }
				})
				const putTryFailedEffect = gen.next()
				if (i < 3) {
					const delayAndPutAgainEffect = gen.next()
					expect(delayAndPutAgainEffect.value).toEqual(
						put(createAction(NET_ACTION.FETCH_REQUESTED, { modelName: 'test' }))
					)
				}
			}
			const delayAndPutFetchFailedEffect = gen.next()
			expect(delayAndPutFetchFailedEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_FAILED, {
						modelName: 'test',
						errorData: { title: 'Error' }
					})
				)
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})

		test('should dispatch TRANSIENT_FETCH_FAILED when all retries have failed for TRANSIENT_FETCH request', () => {
			const gen = fetchData({
				modelName: 'test',
				type: NET_ACTION.DATA_REQUESTED,
				noStore: true
			})
			const putFetchRequestEffect = gen.next()
			for (let i = 0; i <= 3; i++) {
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				const fetchTryFailedEffect = gen.next({
					ok: false,
					status: 500,
					data: { title: 'Error' }
				})
				const putTryFailedEffect = gen.next()
				if (i < 3) {
					const delayAndPutAgainEffect = gen.next()
					expect(delayAndPutAgainEffect.value).toEqual(
						put(
							createAction(NET_ACTION.TRANSIENT_FETCH_REQUESTED, {
								modelName: 'test'
							})
						)
					)
				}
			}
			const delayAndPutFetchFailedEffect = gen.next()
			expect(delayAndPutFetchFailedEffect.value).toEqual(
				put(
					createAction(NET_ACTION.TRANSIENT_FETCH_FAILED, {
						modelName: 'test',
						errorData: { title: 'Error' }
					})
				)
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})

		test('should not call errorFunction if fetchResult.code is 401', () => {
			errorOutput = null
			const gen = fetchData({ modelName: 'test', type: NET_ACTION.DATA_REQUESTED })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			const fetchTryFailedEffect = gen.next({
				ok: false,
				status: 401,
				data: { title: 'Error', code: 401 }
			})
			const putTryFailedEffect = gen.next()
			const delayEffect = gen.next()
			expect(errorOutput).toEqual(null)
		})

		test('should not return errorData if some unrelated error occurred', () => {
			errorOutput = null
			const gen = fetchData({
				modelName: 'test',
				type: NET_ACTION.DATA_REQUESTED,
				noRetry: true
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const fetchEffect = gen.next(getOauthToken())
			const throwFetchErrorEffect = !!gen.throw && gen.throw('some other error')
			const putTryFailedEffect = gen.next()
			const putErrorEffect = gen.next()
			expect(putErrorEffect.value).toEqual(
				put(
					createAction(NET_ACTION.FETCH_FAILED, {
						modelName: 'test'
					})
				)
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})
	})

	describe('collection fetch', () => {
		describe('GET collection', () => {
			test('should return a key-value object by id of nested items, from an api array', () => {
				const fetchedAt = new Date()
				MockDate.set(fetchedAt)

				const gen = fetchData({ modelName: 'entities', type: NET_ACTION.DATA_REQUESTED })
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								}
							},
							modelName: 'entities'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})

			test('should return a key-value object by id of nested items, from a key-value api object', () => {
				const fetchedAt = new Date()
				MockDate.set(fetchedAt)

				const gen = fetchData({ modelName: 'entities', type: NET_ACTION.DATA_REQUESTED })
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { 1: { id: 1, name: 'foo' }, 2: { id: 2, name: 'bar' } }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								}
							},
							modelName: 'entities'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})

		describe('GET item', () => {
			test('should append pathParam "/{:id}" onto path if "pathParams" array includes a single value', () => {
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/entities/999',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					})
				)
			})

			test('should add new single entity by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [2],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { id: 2, name: 'bar' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: { id: 2, name: 'bar', guid },
							guid,
							modelName: 'entities.2'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})

		describe('POST item', () => {
			test('should not append pathParam "/{:id}" onto path if action.method is "POST"', () => {
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'POST'
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/entities',
						headers: { Authorization: 'Bearer some-access-token' },
						method: 'POST',
						queryParams: {}
					})
				)
			})

			test('should store a temp item under "guid" key during request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'POST',
					guid
				})
				const putFetchRequestEffect = gen.next()
				expect(putFetchRequestEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_REQUESTED, {
							modelName: `entities.${guid}`,
							guid
						})
					)
				)
			})

			test('should add new item by "id" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { id: 3, name: 'baz' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: { id: 3, name: 'baz', guid },
							guid,
							modelName: 'entities.3'
						})
					)
				)
			})

			test('should remove temp item by "guid" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { id: 3, name: 'baz' }
				})
				const resultStoredEffect = gen.next()
				expect(resultStoredEffect.value).toEqual(
					put(
						createAction(NET_ACTION.KEY_REMOVAL_REQUESTED, {
							modelName: `entities.${guid}`
						})
					)
				)
			})
		})

		describe('DELETE item', () => {
			test('should append pathParam "/{:id}" onto path if "pathParams.id" exists', () => {
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'DELETE',
					pathParams: [999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/entities/999',
						method: 'DELETE',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					})
				)
			})

			test('should remove item by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'DELETE',
					pathParams: [2],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 204,
					data: undefined
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.KEY_REMOVAL_REQUESTED, {
							data: { guid },
							guid,
							modelName: 'entities.2'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})

		describe('GET item action', () => {
			test('should replace pathParams of "/{:id}" in path if "pathParams" array includes any values', () => {
				const gen = fetchData({
					modelName: 'topLevelEntities.entityAction',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/topLevelEntities/1/entityAction',
						method: 'POST',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					})
				)
			})

			test('should add result on single nested entity by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.entityAction',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [2],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { foo: 'bar' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: { foo: 'bar', guid },
							guid,
							modelName: 'topLevelEntities.2.entityAction'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})
	})

	describe('nested collection fetch', () => {
		describe('GET nested collection', () => {
			test('should return a key-value object by id of nested items, from an api array', () => {
				const fetchedAt = new Date()
				MockDate.set(fetchedAt)

				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								}
							},
							modelName: 'topLevelEntities.1.secondLevelEntities'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})

			test('should return a key-value object by id of nested items, from a key-value api object', () => {
				const fetchedAt = new Date()
				MockDate.set(fetchedAt)

				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { 1: { id: 1, name: 'foo' }, 2: { id: 2, name: 'bar' } }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										fetchedAt
									}
								}
							},
							modelName: 'topLevelEntities.1.secondLevelEntities'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})

		describe('GET item', () => {
			test('should replace pathParams of "/{:id}" in path if "pathParams" array includes any values', () => {
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1, 999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/topLevelEntities/1/secondLevelEntities/999',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					})
				)
			})

			test('should add new single nested entity by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [2, 999],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { id: 999, name: 'bar' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: { id: 999, name: 'bar', guid },
							guid,
							modelName: 'topLevelEntities.2.secondLevelEntities.999'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})

		describe('POST item', () => {
			test('should not append pathParam "/{:id}" onto path if action.method is "POST"', () => {
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1],
					method: 'POST'
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/topLevelEntities/1/secondLevelEntities',
						headers: { Authorization: 'Bearer some-access-token' },
						method: 'POST',
						queryParams: {}
					})
				)
			})

			test('should store a temp item under "guid" key during request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1],
					method: 'POST',
					guid
				})
				const putFetchRequestEffect = gen.next()
				expect(putFetchRequestEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_REQUESTED, {
							modelName: `topLevelEntities.1.secondLevelEntities.${guid}`,
							guid
						})
					)
				)
			})

			test('should add new item by "id" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1],
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { id: 3, name: 'baz' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: { id: 3, name: 'baz', guid },
							guid,
							modelName: 'topLevelEntities.1.secondLevelEntities.3'
						})
					)
				)
			})

			test('should remove temp item by "guid" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1],
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { id: 3, name: 'baz' }
				})
				const resultStoredEffect = gen.next()
				expect(resultStoredEffect.value).toEqual(
					put(
						createAction(NET_ACTION.KEY_REMOVAL_REQUESTED, {
							modelName: `topLevelEntities.1.secondLevelEntities.${guid}`
						})
					)
				)
			})
		})

		describe('DELETE item', () => {
			test('should append pathParam "/{:id}" onto path if "pathParams.id" exists', () => {
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'DELETE',
					pathParams: [1, 999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/topLevelEntities/1/secondLevelEntities/999',
						method: 'DELETE',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					})
				)
			})

			test('should remove item by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					type: NET_ACTION.DATA_REQUESTED,
					method: 'DELETE',
					pathParams: [1, 2],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 204,
					data: undefined
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.KEY_REMOVAL_REQUESTED, {
							data: { guid },
							guid,
							modelName: 'topLevelEntities.1.secondLevelEntities.2'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})

		describe('GET item action', () => {
			test('should replace pathParams of "/{:id}" in path if "pathParams" array includes any values', () => {
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities.entityAction',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [1, 999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next(getOauthToken())
				expect(fetchEffect.value).toEqual(
					call(doFetch, {
						path: 'http://www.google.com/topLevelEntities/1/secondLevelEntities/999/entityAction',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					})
				)
			})

			test('should add result on single nested entity by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities.entityAction',
					type: NET_ACTION.DATA_REQUESTED,
					pathParams: [2, 999],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const fetchEffect = gen.next()
				const resultReceivedEffect = gen.next({
					ok: true,
					status: 200,
					data: { foo: 'bar' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(NET_ACTION.FETCH_RESULT_RECEIVED, {
							data: { foo: 'bar', guid },
							guid,
							modelName: 'topLevelEntities.2.secondLevelEntities.999.entityAction'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})
	})
})

describe('fetchOnce', () => {
	test('should call fetchData exactly once', () => {
		const gen = fetchOnce({ modelName: 'foo', type: NET_ACTION.DATA_REQUESTED })
		const callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(
			call(fetchData, { modelName: 'foo', type: NET_ACTION.DATA_REQUESTED })
		)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('fetchDataLoop', () => {
	test('should throw without action.period', () => {
		const gen = fetchDataLoop({
			modelName: 'test',
			type: NET_ACTION.PERIODIC_DATA_REQUESTED
		})
		expect(() => {
			gen.next() // putFetchRequestEffect
		}).toThrow(/`action.period` is required/)
	})

	test('should fetch repeatedly until cancelled', () => {
		const action = { modelName: 'foo', type: NET_ACTION.PERIODIC_DATA_REQUESTED, period: 1000 }
		const gen = fetchDataLoop(action)
		let callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		let delayEffect = gen.next()
		expect(delayEffect.value).toEqual(delay(1000))

		callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		delayEffect = gen.next()
		expect(delayEffect.value).toEqual(delay(1000))

		const cancelledSaga = !!gen.return ? gen.return() : { value: false }
		expect(cancelledSaga.value).toEqual(cancelled())

		const putPeriodicTerminationSucceededEffect = gen.next(true)
		expect(putPeriodicTerminationSucceededEffect.value).toEqual(
			put(
				createAction(NET_ACTION.PERIODIC_TERMINATION_SUCCEEDED, {
					modelName: 'foo'
				})
			)
		)

		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should fetch repeatedly until error is thrown', () => {
		const action = { modelName: 'foo', type: NET_ACTION.PERIODIC_DATA_REQUESTED, period: 1000 }
		const gen = fetchDataLoop(action)
		let callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		let delayEffect = gen.next()
		expect(delayEffect.value).toEqual(delay(1000))

		callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		delayEffect = gen.next()
		expect(delayEffect.value).toEqual(delay(1000))

		const throwEffect = !!gen.throw ? gen.throw('error') : { value: false }
		expect(throwEffect.value).toEqual(cancelled())

		// send "false" because this was an error not a cancellation
		const putPeriodicTerminationSucceededEffect = gen.next(false)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('fetchDataRecurring', () => {
	test('should throw without action.period', () => {
		const gen = fetchDataRecurring({
			modelName: 'test',
			type: NET_ACTION.PERIODIC_DATA_REQUESTED
		})
		expect(() => {
			const putFetchRequestEffect = gen.next()
		}).toThrow(/'period' config parameter is required for fetchDataRecurring/)
	})

	test('should throw without action.taskId', () => {
		const gen = fetchDataRecurring({
			modelName: 'test',
			type: NET_ACTION.PERIODIC_DATA_REQUESTED,
			period: 1000
		})
		expect(() => {
			const putFetchRequestEffect = gen.next()
		}).toThrow(/'taskId' config parameter is required for fetchDataRecurring/)
	})

	test('should fork off fetchData loop if all params are given', () => {
		const action = {
			modelName: 'test',
			type: NET_ACTION.PERIODIC_DATA_REQUESTED,
			period: 1000,
			taskId: 'fooTask'
		}
		const gen = fetchDataRecurring(action)
		const forkEffect = gen.next()
		expect(forkEffect.value).toEqual(fork(fetchDataLoop, action))
	})

	test('should call matchesTerminationAction from takeMatchesTerminationAction', () => {
		const action = { period: 1000, taskId: 'fooTask' }
		expect(
			takeMatchesTerminationAction(action)({
				type: NET_ACTION.PERIODIC_TERMINATION_REQUESTED,
				taskId: 'fooTask'
			})
		).toEqual(true)
	})

	test('should not cancel if action is not a cancel for that task', () => {
		expect(matchesTerminationAction({ type: 'foo' }, { period: 1000, taskId: 'fooTask' })).toEqual(false)
	})

	test('should not cancel if action is a cancel for another task', () => {
		expect(
			matchesTerminationAction(
				{
					type: NET_ACTION.PERIODIC_TERMINATION_REQUESTED,
					taskId: 'someOtherTask'
				},
				{ period: 1000, taskId: 'fooTask' }
			)
		).toEqual(false)
	})

	test('should cancel if action is a cancel for that task', () => {
		expect(
			matchesTerminationAction(
				{
					type: NET_ACTION.PERIODIC_TERMINATION_REQUESTED,
					taskId: 'fooTask'
				},
				{ period: 1000, taskId: 'fooTask' }
			)
		).toEqual(true)
	})

	test('should cancel once take matches action', () => {
		const action = {
			modelName: 'test',
			type: NET_ACTION.DATA_REQUESTED,
			period: 1000,
			taskId: 'fooTask'
		}
		const gen = fetchDataRecurring(action)
		const forkEffect = gen.next()
		const mockTask = createMockTask()
		const takeTerminationEffect = gen.next(mockTask)
		const cancelledTask = gen.next()
		expect(cancelledTask.value).toEqual(cancel(mockTask))
	})
})
