import actions, { createAction } from '../src/actions'
import { delay } from 'redux-saga'
import {
	call,
	cancel,
	cancelled,
	take,
	takeEvery,
	takeLatest,
	fork,
	put,
	race,
	select
} from 'redux-saga/effects'
import { createMockTask } from 'redux-saga/utils'
import uuid from 'uuid'
import { doFetch } from '../src/services/fetchService'
import fetchSaga, { __RewireAPI__ as FetchSagaRewireAPI } from '../src/fetchSaga'
import { returnEntireStore } from '../src/fetchReducer'

// TODO: retry
const fetchData = FetchSagaRewireAPI.__get__('fetchData')
const fetchOnce = FetchSagaRewireAPI.__get__('fetchOnce')
const fetchDataRecurring = FetchSagaRewireAPI.__get__('fetchDataRecurring')
const fetchDataLoop = FetchSagaRewireAPI.__get__('fetchDataLoop')
const getState = FetchSagaRewireAPI.__get__('getState')
const matchesTerminationAction = FetchSagaRewireAPI.__get__('matchesTerminationAction')
const takeMatchesTerminationAction = FetchSagaRewireAPI.__get__('takeMatchesTerminationAction')

let consoleOutput
const _consoleLog = console.debug

beforeAll(() => {
	console.debug = jest.fn(message => {
		consoleOutput = message
	})
})

afterAll(() => {
	console.debug = _consoleLog
})

const getOauthToken = () => {
	return { access_token: 'some-access-token' }
}

describe('fetchSaga', () => {
	test('should throw without modelsParam', () => {
		const gen = fetchSaga()
		expect(() => {
			const takeEveryDataRequestEffect = gen.next()
		}).toThrow(/'modelsParam' is required for fetchSaga/)
	})

	test('should set up all takes', () => {
		const gen = fetchSaga({})

		const takeEveryDataRequestEffect = gen.next()
		expect(takeEveryDataRequestEffect.value).toEqual(takeEvery(actions.DATA_REQUESTED, fetchOnce))
		const takeEveryPeriodicDataRequestEffect = gen.next()
		expect(takeEveryPeriodicDataRequestEffect.value).toEqual(
			takeEvery(actions.PERIODIC_DATA_REQUESTED, fetchDataRecurring)
		)
		const takeLatestDataRequestedEffect = gen.next()
		expect(takeLatestDataRequestedEffect.value).toEqual(
			takeLatest(actions.DATA_REQUESTED_USE_LATEST, fetchOnce)
		)
	})

	test('should use default logger', () => {
		const gen = fetchSaga({ test: { path: '/foo' } }, '')
		expect(consoleOutput).toEqual('logger set to defaultLogger')
	})

	test('should use default tokenAccessFunction if null', () => {
		const gen = fetchSaga({ test: { path: '/foo' } }, '')
		const tokenAccessFunction = FetchSagaRewireAPI.__get__('tokenAccessFunction')
		const defaultTokenAccessFunction = FetchSagaRewireAPI.__get__('defaultTokenAccessFunction')
		expect(tokenAccessFunction).toEqual(defaultTokenAccessFunction)
		expect(tokenAccessFunction()).toEqual(undefined)
	})

	test('should use default errorFunction if null', () => {
		const gen = fetchSaga({ test: { path: '/foo' } }, '')
		const errorFunction = FetchSagaRewireAPI.__get__('errorFunction')
		const defaultErrorFunction = FetchSagaRewireAPI.__get__('defaultErrorFunction')
		expect(errorFunction).toEqual(defaultErrorFunction)
		expect(errorFunction()).toEqual(undefined)
	})
})

describe('fetchData', () => {
	let errorOutput
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
					secondLevelEntities: {
						_config: {
							fetch: {
								path: 'secondLevelEntities'
							},
							isCollection: true
						}
					}
				},
				topLevelEntitiesNoPath: {
					_config: {
						isCollection: true
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
					},
					entityAction: {
						_config: {
							fetch: {
								path: 'entityAction',
								method: 'POST'
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
			const gen = fetchData({})
			expect(() => {
				const startGenerator = gen.next()
			}).toThrow(/modelName' config parameter is required for fetchData/)
		})

		test('should throw when action.modelName is not found in models', () => {
			const gen = fetchData({ modelName: 'foo' })
			expect(() => {
				const startGenerator = gen.next()
			}).toThrow(/Cannot find 'foo' model in model dictionary/)
		})

		test('should use "action.method" if it is defined', () => {
			const gen = fetchData({ modelName: 'test', method: 'POST' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://www.google.com',
						headers: { Authorization: 'Bearer some-access-token' },
						method: 'POST',
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})
		test('should replace baseConfig body as string if body is string', () => {
			const gen = fetchData({ modelName: 'test2', body: 'body' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://news.ycombinator.com',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {},
						body: 'body'
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should merge body as JSON if body is JSON', () => {
			const gen = fetchData({ modelName: 'test3', body: { baz: 'quux' } })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://news.ycombinator.com',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {},
						body: {
							foo: 'bar',
							baz: 'quux'
						}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should populate store parameter in path', () => {
			const gen = fetchData({ modelName: 'test4' })
			const selectEffect = gen.next()
			const putFetchRequestEffect = gen.next({ testServer: 'baz' })
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://baz',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should fail to populate store parameter in path if it is undefined', () => {
			const gen = fetchData({ modelName: 'test4' })
			const selectEffect = gen.next()
			// send empty store
			const putFetchRequestEffect = gen.next(getState())
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
						modelName: 'test4',
						errorData: 'Invalid URL'
					})
				)
			)
			// trigger fetchData fn end
			gen.next()
		})

		test('should fail to populate store parameter in path if it is null', () => {
			const gen = fetchData({ modelName: 'test4' })
			const selectEffect = gen.next()
			// send store with null value
			const putFetchRequestEffect = gen.next({ testServer: null })
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
						modelName: 'test4',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should populate basic parmater in path', () => {
			const gen = fetchData({ modelName: 'test5', pathParams: [1] })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://www.google.com/1',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should fail to populate basic parameter in path if it is undefined', () => {
			const gen = fetchData({ modelName: 'test5' })
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
						modelName: 'test5',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should fail to populate basic parameter in path if it is null', () => {
			const gen = fetchData({ modelName: 'test5', pathParams: [null] })
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
						modelName: 'test5',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should fail to populate basic parameter in path when "noStore" = true', () => {
			const gen = fetchData({ modelName: 'test5', noStore: true })
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(actions.TRANSIENT_FETCH_FAILED, {
						modelName: 'test5',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should populate basic and store parameters in path', () => {
			const gen = fetchData({ modelName: 'test6', pathParams: [1] })
			const selectEffect = gen.next()
			const putFetchRequestEffect = gen.next({ testServer: 'baz' })
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://baz/1',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should construct path from modelName for collections without paths, no pathParams', () => {
			const gen = fetchData({ modelName: 'topLevelEntitiesNoPath' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: '/api/topLevelEntitiesNoPath',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should construct path from modelName for collections without paths, single level, with pathParams', () => {
			const gen = fetchData({ modelName: 'topLevelEntitiesNoPath', pathParams: [1] })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: '/api/topLevelEntitiesNoPath/1',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should construct path from modelName for collections without paths, nested level, with pathParams', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath.secondLevelEntities',
				pathParams: [1]
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: '/api/topLevelEntitiesNoPath/1/secondLevelEntities',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should construct path from modelName for collection item action, single level, with pathParams', () => {
			const gen = fetchData({ modelName: 'topLevelEntitiesNoPath.entityAction', pathParams: [1] })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: '/api/topLevelEntitiesNoPath/1/entityAction',
						method: 'POST',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should construct path from modelName for collection item action, nested level, with pathParams', () => {
			const gen = fetchData({
				modelName: 'topLevelEntitiesNoPath.secondLevelEntities.entityAction',
				pathParams: [1, 999]
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: '/api/topLevelEntitiesNoPath/1/secondLevelEntities/999/entityAction',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})

		test('should fail to populate basic parameter in path if it is undefined, for collection', () => {
			const gen = fetchData({ modelName: 'topLevelEntitiesNoPath', pathParams: [undefined] })
			const putFetchRequestEffect = gen.next()
			expect(putFetchRequestEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
						modelName: 'topLevelEntitiesNoPath',
						errorData: 'Invalid URL'
					})
				)
			)
		})

		test('should emit FETCH_REQUESTED', () => {
			const gen = fetchData({ modelName: 'test' })
			const startGenerator = gen.next()
			expect(startGenerator.value).toEqual(
				put(
					createAction(actions.FETCH_REQUESTED, {
						modelName: 'test'
					})
				)
			)
		})

		test('should add oauth token to header if it exists', () => {
			const gen = fetchData({ modelName: 'test' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://www.google.com',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 30000)
				})
			)
		})
	})

	describe('successful fetch', () => {
		test('should execute basic fetch', () => {
			const gen = fetchData({ modelName: 'test' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next()
			const resultReceivedEffect = gen.next({ fetchResult: { foo: 'bar' } })
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(actions.FETCH_RESULT_RECEIVED, { data: { foo: 'bar' }, modelName: 'test' })
				)
			)
			expect(gen.next().done).toEqual(true)
		})

		test('should execute basic transient fetch', () => {
			const gen = fetchData({ modelName: 'test', noStore: true })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const resultReceivedEffect = gen.next({ fetchResult: { foo: 'bar' } })
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(actions.TRANSIENT_FETCH_RESULT_RECEIVED, {
						data: { foo: 'bar' },
						modelName: 'test'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})

		test('should return "guid" on fetchResult if passed in "action.guid"', () => {
			const guid = uuid.v4()
			const gen = fetchData({ modelName: 'test', method: 'POST', guid })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next()
			const resultReceivedEffect = gen.next({ fetchResult: { foo: 'bar' } })
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(actions.FETCH_RESULT_RECEIVED, {
						data: { foo: 'bar', guid },
						modelName: 'test'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})
	})

	describe('failed fetch', () => {
		test('should retry when fetch times out', () => {
			const gen = fetchData({ modelName: 'test' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const putFetchTimedOutEffect = gen.next({ timedOutResult: true })
			const putTryFailedEffect = gen.next()
			const delayAndPutAgainEffect = gen.next()
			expect(delayAndPutAgainEffect.value).toEqual(
				put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
			)
		})

		test('should not retry when fetch times out and noRetry is specified', () => {
			const gen = fetchData({ modelName: 'test', noRetry: true })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const putFetchTimedOutEffect = gen.next({ timedOutResult: true })
			const putTryFailedEffect = gen.next()
			const putFailedEffect = gen.next()
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})

		test('should time out to a configurable value', () => {
			const gen = fetchData({ modelName: 'test', timeLimit: 1000 })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://www.google.com',
						headers: { Authorization: 'Bearer some-access-token' },
						queryParams: {}
					}),
					timedOutResult: call(delay, 1000)
				})
			)
		})

		test('should retry on fetch error', () => {
			const gen = fetchData({ modelName: 'test' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const fetchTryFailedEffect = gen.next({ fetchResult: { title: 'Error' } })
			const putTryFailedEffect = gen.next()
			const delayAndPutAgainEffect = gen.next()
			expect(delayAndPutAgainEffect.value).toEqual(
				put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
			)
		})

		test('should dispatch FETCH_FAILED when all retries have failed', () => {
			const gen = fetchData({ modelName: 'test' })
			const putFetchRequestEffect = gen.next()
			for (let i = 0; i <= 3; i++) {
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				const fetchTryFailedEffect = gen.next({ fetchResult: { title: 'Error' } })
				const putTryFailedEffect = gen.next()
				if (i < 3) {
					const delayAndPutAgainEffect = gen.next()
					expect(delayAndPutAgainEffect.value).toEqual(
						put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
					)
				}
			}
			const delayAndPutFetchFailedEffect = gen.next()
			expect(delayAndPutFetchFailedEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
						modelName: 'test',
						errorData: { didTimeOut: false, title: 'Error' }
					})
				)
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})

		test('should dispatch FETCH_FAILED with didTimeOut if all tries timedOut', () => {
			const gen = fetchData({ modelName: 'test' })
			const putFetchRequestEffect = gen.next()
			for (let i = 0; i <= 3; i++) {
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				const fetchTryFailedEffect = gen.next({ timedOutResult: true })
				const putTryFailedEffect = gen.next()
				if (i < 3) {
					const delayAndPutAgainEffect = gen.next()
					expect(delayAndPutAgainEffect.value).toEqual(
						put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
					)
				}
			}
			const delayAndPutFetchFailedEffect = gen.next()
			expect(delayAndPutFetchFailedEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
						modelName: 'test',
						errorData: { didTimeOut: true }
					})
				)
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})

		test('should dispatch TRANSIENT_FETCH_FAILED when all retries have failed for TRANSIENT_FETCH request', () => {
			const gen = fetchData({ modelName: 'test', noStore: true })
			const putFetchRequestEffect = gen.next()
			for (let i = 0; i <= 3; i++) {
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				const fetchTryFailedEffect = gen.next({ fetchResult: { title: 'Error' } })
				const putTryFailedEffect = gen.next()
				if (i < 3) {
					const delayAndPutAgainEffect = gen.next()
					expect(delayAndPutAgainEffect.value).toEqual(
						put(createAction(actions.TRANSIENT_FETCH_REQUESTED, { modelName: 'test' }))
					)
				}
			}
			const delayAndPutFetchFailedEffect = gen.next()
			expect(delayAndPutFetchFailedEffect.value).toEqual(
				put(
					createAction(actions.TRANSIENT_FETCH_FAILED, {
						modelName: 'test',
						errorData: { didTimeOut: false, title: 'Error' }
					})
				)
			)
			const sagaDone = gen.next()
			expect(sagaDone.done).toEqual(true)
		})

		test('should not call errorFunction if fetchResult.code is 401', () => {
			errorOutput = null
			const gen = fetchData({ modelName: 'test' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const fetchTryFailedEffect = gen.next({ fetchResult: { title: 'Error', code: 401 } })
			const putTryFailedEffect = gen.next()
			const delayEffect = gen.next()
			expect(errorOutput).toEqual(null)
		})

		test('should not return errorData if some unrelated error occurred', () => {
			errorOutput = null
			const gen = fetchData({ modelName: 'test', noRetry: true })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const throwFetchErrorEffect = gen.throw('some other error')
			const putTryFailedEffect = gen.next()
			const putErrorEffect = gen.next()
			expect(putErrorEffect.value).toEqual(
				put(
					createAction(actions.FETCH_FAILED, {
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
				const _Date = Date
				global.Date = jest.fn(() => fetchedAt)

				const gen = fetchData({ modelName: 'entities' })
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
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
				const _Date = Date
				global.Date = jest.fn(() => fetchedAt)

				const gen = fetchData({ modelName: 'entities' })
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { '1': { id: 1, name: 'foo' }, 2: { id: 2, name: 'bar' } }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
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
					pathParams: [999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				expect(raceEffect.value).toEqual(
					race({
						fetchResult: call(doFetch, {
							path: 'http://www.google.com/entities/999',
							headers: { Authorization: 'Bearer some-access-token' },
							queryParams: {}
						}),
						timedOutResult: call(delay, 30000)
					})
				)
			})

			test('should add new single entity by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					pathParams: [2],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { id: 2, name: 'bar' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: { id: 2, name: 'bar', guid },
							modelName: 'entities.2'
						})
					)
				)
				expect(gen.next().done).toEqual(true)
			})
		})

		describe('POST item', () => {
			test('should not append pathParam "/{:id}" onto path if action.method is "POST"', () => {
				const gen = fetchData({ modelName: 'entities', method: 'POST' })
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				expect(raceEffect.value).toEqual(
					race({
						fetchResult: call(doFetch, {
							path: 'http://www.google.com/entities',
							headers: { Authorization: 'Bearer some-access-token' },
							method: 'POST',
							queryParams: {}
						}),
						timedOutResult: call(delay, 30000)
					})
				)
			})

			test('should store a temp item under "guid" key during request', () => {
				const guid = uuid.v4()
				const gen = fetchData({ modelName: 'entities', method: 'POST', guid })
				const putFetchRequestEffect = gen.next()
				expect(putFetchRequestEffect.value).toEqual(
					put(
						createAction(actions.FETCH_REQUESTED, {
							modelName: `entities.${guid}`
						})
					)
				)
			})

			test('should add new item by "id" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { id: 3, name: 'baz' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: { id: 3, name: 'baz', guid },
							modelName: 'entities.3'
						})
					)
				)
			})

			test('should remove temp item by "guid" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { id: 3, name: 'baz' }
				})
				const resultStoredEffect = gen.next()
				expect(resultStoredEffect.value).toEqual(
					put(
						createAction(actions.KEY_REMOVAL_REQUESTED, {
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
					method: 'DELETE',
					pathParams: [999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				expect(raceEffect.value).toEqual(
					race({
						fetchResult: call(doFetch, {
							path: 'http://www.google.com/entities/999',
							method: 'DELETE',
							headers: { Authorization: 'Bearer some-access-token' },
							queryParams: {}
						}),
						timedOutResult: call(delay, 30000)
					})
				)
			})

			test('should remove item by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'entities',
					method: 'DELETE',
					pathParams: [2],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: 'success'
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.KEY_REMOVAL_REQUESTED, {
							data: { guid },
							modelName: 'entities.2'
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
				const _Date = Date
				global.Date = jest.fn(() => fetchedAt)

				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					pathParams: [1]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: [{ id: 1, name: 'foo' }, { id: 2, name: 'bar' }]
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
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
				const _Date = Date
				global.Date = jest.fn(() => fetchedAt)

				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					pathParams: [1]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { '1': { id: 1, name: 'foo' }, 2: { id: 2, name: 'bar' } }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: {
								1: {
									id: 1,
									name: 'foo',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
										fetchedAt
									}
								},
								2: {
									id: 2,
									name: 'bar',
									_metadata: {
										isFetching: false,
										hasError: false,
										timedOut: false,
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
					pathParams: [1, 999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				expect(raceEffect.value).toEqual(
					race({
						fetchResult: call(doFetch, {
							path: 'http://www.google.com/topLevelEntities/1/secondLevelEntities/999',
							headers: { Authorization: 'Bearer some-access-token' },
							queryParams: {}
						}),
						timedOutResult: call(delay, 30000)
					})
				)
			})

			test('should add new single nested entity by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					pathParams: [2, 999],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { id: 999, name: 'bar' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: { id: 999, name: 'bar', guid },
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
					pathParams: [1],
					method: 'POST'
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				expect(raceEffect.value).toEqual(
					race({
						fetchResult: call(doFetch, {
							path: 'http://www.google.com/topLevelEntities/1/secondLevelEntities',
							headers: { Authorization: 'Bearer some-access-token' },
							method: 'POST',
							queryParams: {}
						}),
						timedOutResult: call(delay, 30000)
					})
				)
			})

			test('should store a temp item under "guid" key during request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					pathParams: [1],
					method: 'POST',
					guid
				})
				const putFetchRequestEffect = gen.next()
				expect(putFetchRequestEffect.value).toEqual(
					put(
						createAction(actions.FETCH_REQUESTED, {
							modelName: `topLevelEntities.1.secondLevelEntities.${guid}`
						})
					)
				)
			})

			test('should add new item by "id" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					pathParams: [1],
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { id: 3, name: 'baz' }
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.FETCH_RESULT_RECEIVED, {
							data: { id: 3, name: 'baz', guid },
							modelName: 'topLevelEntities.1.secondLevelEntities.3'
						})
					)
				)
			})

			test('should remove temp item by "guid" key after request', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					pathParams: [1],
					method: 'POST',
					guid,
					body: { name: 'baz' }
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: { id: 3, name: 'baz' }
				})
				const resultStoredEffect = gen.next()
				expect(resultStoredEffect.value).toEqual(
					put(
						createAction(actions.KEY_REMOVAL_REQUESTED, {
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
					method: 'DELETE',
					pathParams: [1, 999]
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next(getOauthToken())
				expect(raceEffect.value).toEqual(
					race({
						fetchResult: call(doFetch, {
							path: 'http://www.google.com/topLevelEntities/1/secondLevelEntities/999',
							method: 'DELETE',
							headers: { Authorization: 'Bearer some-access-token' },
							queryParams: {}
						}),
						timedOutResult: call(delay, 30000)
					})
				)
			})

			test('should remove item by id', () => {
				const guid = uuid.v4()
				const gen = fetchData({
					modelName: 'topLevelEntities.secondLevelEntities',
					method: 'DELETE',
					pathParams: [1, 2],
					guid
				})
				const putFetchRequestEffect = gen.next()
				const tokenAccessCall = gen.next()
				const raceEffect = gen.next()
				const resultReceivedEffect = gen.next({
					fetchResult: 'success'
				})
				expect(resultReceivedEffect.value).toEqual(
					put(
						createAction(actions.KEY_REMOVAL_REQUESTED, {
							data: { guid },
							modelName: 'topLevelEntities.1.secondLevelEntities.2'
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
		const gen = fetchOnce({ modelName: 'foo' })
		const callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, { modelName: 'foo' }))
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('fetchDataLoop', () => {
	test('should fetch repeatedly until cancelled', () => {
		const action = { modelName: 'foo', period: 1000 }
		const gen = fetchDataLoop(action)
		let callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		let delayEffect = gen.next()
		expect(delayEffect.value).toEqual(call(delay, 1000))

		callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		delayEffect = gen.next()
		expect(delayEffect.value).toEqual(call(delay, 1000))

		const cancelledSaga = gen.return()
		expect(cancelledSaga.value).toEqual(cancelled())

		const putPeriodicTerminationSucceededEffect = gen.next(true)
		expect(putPeriodicTerminationSucceededEffect.value).toEqual(
			put(
				createAction(actions.PERIODIC_TERMINATION_SUCCEEDED, {
					modelName: 'foo'
				})
			)
		)

		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should fetch repeatedly until error is thrown', () => {
		const action = { modelName: 'foo', period: 1000 }
		const gen = fetchDataLoop(action)
		let callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		let delayEffect = gen.next()
		expect(delayEffect.value).toEqual(call(delay, 1000))

		callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, action))
		delayEffect = gen.next()
		expect(delayEffect.value).toEqual(call(delay, 1000))

		const error = {}
		callFetchDataEffect = gen.throw('error')
		expect(callFetchDataEffect.value).toEqual(cancelled())

		// send "false" because this was an error not a cancellation
		const putPeriodicTerminationSucceededEffect = gen.next(false)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})
})

describe('fetchDataRecurring', () => {
	test('should throw without action', () => {
		const gen = fetchDataRecurring()
		expect(() => {
			const putFetchRequestEffect = gen.next()
		}).toThrow(/'period' config parameter is required for fetchDataRecurring/)
	})

	test('should throw without action.period', () => {
		const gen = fetchDataRecurring({})
		expect(() => {
			const putFetchRequestEffect = gen.next()
		}).toThrow(/'period' config parameter is required for fetchDataRecurring/)
	})

	test('should throw without action.taskId', () => {
		const gen = fetchDataRecurring({ period: 1000 })
		expect(() => {
			const putFetchRequestEffect = gen.next()
		}).toThrow(/'taskId' config parameter is required for fetchDataRecurring/)
	})

	test('should fork off fetchData loop if all params are given', () => {
		const action = { period: 1000, taskId: 'fooTask' }
		const gen = fetchDataRecurring(action)
		const forkEffect = gen.next()
		expect(forkEffect.value).toEqual(fork(fetchDataLoop, action))
	})

	test('should call matchesTerminationAction from takeMatchesTerminationAction', () => {
		const action = { period: 1000, taskId: 'fooTask' }
		expect(
			takeMatchesTerminationAction(action)({
				type: actions.PERIODIC_TERMINATION_REQUESTED,
				taskId: 'fooTask'
			})
		).toEqual(true)
	})

	test('should not cancel if action is not a cancel for that task', () => {
		expect(matchesTerminationAction({ type: 'foo' }, { period: 1000, taskId: 'fooTask' })).toEqual(
			false
		)
	})

	test('should not cancel if action is a cancel for another task', () => {
		expect(
			matchesTerminationAction(
				{
					type: actions.PERIODIC_TERMINATION_REQUESTED,
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
					type: actions.PERIODIC_TERMINATION_REQUESTED,
					taskId: 'fooTask'
				},
				{ period: 1000, taskId: 'fooTask' }
			)
		).toEqual(true)
	})

	test('should cancel once take matches action', () => {
		const action = { period: 1000, taskId: 'fooTask' }
		const gen = fetchDataRecurring(action)
		const forkEffect = gen.next()
		const mockTask = createMockTask()
		const takeTerminationEffect = gen.next(mockTask)
		const cancelledTask = gen.next()
		expect(cancelledTask.value).toEqual(cancel(mockTask))
	})
})
