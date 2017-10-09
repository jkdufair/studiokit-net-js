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
import { doFetch } from '../src/services/fetchService'
import fetchSaga, { __RewireAPI__ as FetchSagaRewireAPI } from '../src/fetchSaga'
import { returnEntireStore } from '../src/fetchReducer'

// TODO: retry
const fetchData = FetchSagaRewireAPI.__get__('fetchData')
const fetchOnce = FetchSagaRewireAPI.__get__('fetchOnce')
const matchesTerminationAction = FetchSagaRewireAPI.__get__('matchesTerminationAction')
const fetchDataRecurring = FetchSagaRewireAPI.__get__('fetchDataRecurring')
const fetchDataLoop = FetchSagaRewireAPI.__get__('fetchDataLoop')

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

describe('fetchSaga ctor', () => {
	test('should throw without models', () => {
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
		expect(consoleOutput).toEqual('logger set to consoleLogger')
	})

	test('should use default tokenAccess', () => {
		const gen = fetchSaga({ test: { path: '/foo' } }, '')
		const tokenAccess = FetchSagaRewireAPI.__get__('tokenAccess')
		const tokenAccessFunction = FetchSagaRewireAPI.__get__('tokenAccessFunction')
		expect(tokenAccess).toEqual(tokenAccessFunction)
		expect(tokenAccess()).toEqual(undefined)
	})
})

describe('fetchData', () => {
	let errorOutput
	beforeAll(() => {
		const fetchSagaGen = fetchSaga(
			{
				test: {
					path: 'http://www.google.com'
				},
				test2: {
					path: 'http://news.ycombinator.com',
					body: 'string'
				},
				test3: {
					path: 'http://news.ycombinator.com',
					body: { foo: 'bar' }
				},
				test4: {
					path: 'http://{{testServer}}'
				},
				test5: {
					path: 'http://www.google.com/{:entityId}'
				},
				test6: {
					path: 'http://{{testServer}}/{:entityId}'
				},
				entities: {
					path: 'http://www.google.com/entities',
					isCollection: true
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
					queryParams: {},
					routeParams: {}
				}),
				timedOut: call(delay, 30000)
			})
		)
	})

	test('should execute basic fetch', () => {
		const gen = fetchData({ modelName: 'test' })
		const putFetchRequestEffect = gen.next()
		const tokenAccessCall = gen.next()
		const raceEffect = gen.next()
		const resultReceivedEffect = gen.next({ fetchResult: { foo: 'bar' } })
		expect(resultReceivedEffect.value).toEqual(
			put(createAction(actions.FETCH_RESULT_RECEIVED, { data: { foo: 'bar' }, modelName: 'test' }))
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
					queryParams: {},
					routeParams: {}
				}),
				timedOut: call(delay, 30000)
			})
		)
	})

	test('should return "guid" on fetchResult if passed in "action.guid"', () => {
		const gen = fetchData({ modelName: 'test', method: 'POST', guid: 'some-guid' })
		const putFetchRequestEffect = gen.next()
		const tokenAccessCall = gen.next()
		const raceEffect = gen.next()
		const resultReceivedEffect = gen.next({ fetchResult: { foo: 'bar' } })
		expect(resultReceivedEffect.value).toEqual(
			put(
				createAction(actions.FETCH_RESULT_RECEIVED, {
					data: { foo: 'bar', guid: 'some-guid' },
					modelName: 'test'
				})
			)
		)
		expect(gen.next().done).toEqual(true)
	})

	describe('entity collection', () => {
		test('should append routeParam "/{:id}" onto path if action.shouldReturnSingle = true', () => {
			const gen = fetchData({
				modelName: 'entities',
				shouldReturnSingle: true,
				routeParams: { id: 999 }
			})
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://www.google.com/entities/999',
						headers: { Authorization: 'Bearer some-access-token' },
						isCollection: true,
						queryParams: {},
						routeParams: { id: 999 }
					}),
					timedOut: call(delay, 30000)
				})
			)
		})

		test('should append routeParam "/{:id}" onto path if action.method is "PUT", "PATCH", or "DELETE"', () => {
			const gen = fetchData({ modelName: 'entities', method: 'PUT', routeParams: { id: 999 } })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			expect(raceEffect.value).toEqual(
				race({
					fetchResult: call(doFetch, {
						path: 'http://www.google.com/entities/999',
						headers: { Authorization: 'Bearer some-access-token' },
						method: 'PUT',
						isCollection: true,
						queryParams: {},
						routeParams: { id: 999 }
					}),
					timedOut: call(delay, 30000)
				})
			)
		})

		test('should return a key-value object of api results', () => {
			const gen = fetchData({ modelName: 'entities', method: 'GET', guid: 'some-guid' })
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next()
			const resultReceivedEffect = gen.next({
				fetchResult: { items: [{ id: 1, name: 'foo' }, { id: 3, name: 'bar' }] }
			})
			expect(resultReceivedEffect.value).toEqual(
				put(
					createAction(actions.FETCH_RESULT_RECEIVED, {
						data: {
							items: { 1: { id: 1, name: 'foo' }, 3: { id: 3, name: 'bar' } },
							guid: 'some-guid',
							isCollection: true
						},
						modelName: 'entities'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})

		test('should get and add new single entities by id', () => {
			const gen = fetchData({
				modelName: 'entities',
				shouldReturnSingle: true,
				routeParams: { id: 3 },
				guid: 'some-guid'
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
						data: { id: 3, name: 'baz', guid: 'some-guid' },
						modelName: 'entities.items.3'
					})
				)
			)
			expect(gen.next().done).toEqual(true)
		})
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
					routeParams: {},
					body: 'body'
				}),
				timedOut: call(delay, 30000)
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
					routeParams: {},
					body: {
						foo: 'bar',
						baz: 'quux'
					}
				}),
				timedOut: call(delay, 30000)
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
					queryParams: {},
					routeParams: {}
				}),
				timedOut: call(delay, 30000)
			})
		)
	})

	test('should fail to populate store parameter in path if it is undefined', () => {
		const gen = fetchData({ modelName: 'test4' })
		const selectEffect = gen.next()
		// send empty store
		const putFetchRequestEffect = gen.next({})
		expect(putFetchRequestEffect.value).toEqual(
			put(
				createAction(actions.FETCH_TRY_FAILED, {
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
				createAction(actions.FETCH_TRY_FAILED, {
					modelName: 'test4',
					errorData: 'Invalid URL'
				})
			)
		)
	})

	test('should populate route parmater in path', () => {
		const gen = fetchData({ modelName: 'test5', routeParams: { entityId: 1 } })
		const putFetchRequestEffect = gen.next()
		const tokenAccessCall = gen.next()
		const raceEffect = gen.next(getOauthToken())
		expect(raceEffect.value).toEqual(
			race({
				fetchResult: call(doFetch, {
					path: 'http://www.google.com/1',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					routeParams: {
						entityId: 1
					}
				}),
				timedOut: call(delay, 30000)
			})
		)
	})

	test('should fail to populate route parameter in path if it is undefined', () => {
		const gen = fetchData({ modelName: 'test5' })
		const putFetchRequestEffect = gen.next()
		expect(putFetchRequestEffect.value).toEqual(
			put(
				createAction(actions.FETCH_TRY_FAILED, {
					modelName: 'test5',
					errorData: 'Invalid URL'
				})
			)
		)
	})

	test('should fail to populate route parameter in path if it is null', () => {
		const gen = fetchData({ modelName: 'test5', routeParams: { entityId: null } })
		const putFetchRequestEffect = gen.next()
		expect(putFetchRequestEffect.value).toEqual(
			put(
				createAction(actions.FETCH_TRY_FAILED, {
					modelName: 'test5',
					errorData: 'Invalid URL'
				})
			)
		)
	})

	test('should populate route and store parameters in path', () => {
		const gen = fetchData({ modelName: 'test6', routeParams: { entityId: 1 } })
		const selectEffect = gen.next()
		const putFetchRequestEffect = gen.next({ testServer: 'baz' })
		const tokenAccessCall = gen.next()
		const raceEffect = gen.next(getOauthToken())
		expect(raceEffect.value).toEqual(
			race({
				fetchResult: call(doFetch, {
					path: 'http://baz/1',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					routeParams: {
						entityId: 1
					}
				}),
				timedOut: call(delay, 30000)
			})
		)
	})

	test('should retry when fetch times out', () => {
		const gen = fetchData({ modelName: 'test' })
		const putFetchRequestEffect = gen.next()
		const tokenAccessCall = gen.next()
		const raceEffect = gen.next(getOauthToken())
		const putFetchTimedOutEffect = gen.next({ timedOut: true })
		expect(putFetchTimedOutEffect.value).toEqual(
			put(createAction(actions.FETCH_TIMED_OUT, { modelName: 'test' }))
		)
		gen.next()
		expect(gen.next().value).toEqual(
			put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
		)
	})

	test('should not retry when fetch times out and noRetry is specified', () => {
		const gen = fetchData({ modelName: 'test', noRetry: true })
		const putFetchRequestEffect = gen.next()
		const tokenAccessCall = gen.next()
		const raceEffect = gen.next(getOauthToken())
		const putFetchTimedOutEffect = gen.next({ timedOut: true })
		expect(putFetchTimedOutEffect.value).toEqual(
			put(createAction(actions.FETCH_TIMED_OUT, { modelName: 'test' }))
		)
		gen.next()
		expect(gen.next().done).toEqual(true)
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
					queryParams: {},
					routeParams: {}
				}),
				timedOut: call(delay, 1000)
			})
		)
	})

	test('should retry on fetch error', () => {
		const gen = fetchData({ modelName: 'test' })
		const putFetchRequestEffect = gen.next()
		const tokenAccessCall = gen.next()
		const raceEffect = gen.next(getOauthToken())
		const fetchTryFailedEffect = gen.next({ fetchResult: { title: 'Error' } })
		expect(fetchTryFailedEffect.value).toEqual(
			put(
				createAction(actions.FETCH_TRY_FAILED, { modelName: 'test', errorData: { title: 'Error' } })
			)
		)
		const delayEffect = gen.next()
		const putFetchRequestEffectAgain = gen.next()
		expect(putFetchRequestEffectAgain.value).toEqual(
			put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
		)
	})

	test('should dispatch FETCH_FAILED when all retries have failed', () => {
		const gen = fetchData({ modelName: 'test' })
		for (let i = 0; i <= 3; i++) {
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const fetchTryFailedEffect = gen.next({ fetchResult: { title: 'Error' } })
			expect(fetchTryFailedEffect.value).toEqual(
				put(
					createAction(actions.FETCH_TRY_FAILED, {
						modelName: 'test',
						errorData: { title: 'Error' }
					})
				)
			)
			const delayEffect = gen.next()
		}
		const putFetchFailedEffect = gen.next()
		expect(putFetchFailedEffect.value).toEqual(
			put(createAction(actions.FETCH_FAILED, { modelName: 'test' }))
		)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
	})

	test('should not dispatch FETCH_FAILED when all retries were timeouts', () => {
		const gen = fetchData({ modelName: 'test' })
		for (let i = 0; i <= 3; i++) {
			const putFetchRequestEffect = gen.next()
			const tokenAccessCall = gen.next()
			const raceEffect = gen.next(getOauthToken())
			const putFetchTimedOutEffect = gen.next({ timedOut: true })
			expect(putFetchTimedOutEffect.value).toEqual(
				put(
					createAction(actions.FETCH_TIMED_OUT, {
						modelName: 'test'
					})
				)
			)
			const delayEffect = gen.next()
		}

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
		const delayEffect = gen.next()
		expect(errorOutput).toEqual(null)
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
	test('should fetch repeatedly until terminated', () => {
		const gen = fetchDataLoop({ modelName: 'foo', period: 1000 })
		let callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, { modelName: 'foo', period: 1000 }))
		let delayEffect = gen.next()
		expect(delayEffect.value).toEqual(call(delay, 1000))

		callFetchDataEffect = gen.next()
		expect(callFetchDataEffect.value).toEqual(call(fetchData, { modelName: 'foo', period: 1000 }))
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
