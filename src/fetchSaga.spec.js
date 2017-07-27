import actions, { createAction } from './actions'
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
import { doFetch } from './services/fetchService'
import fetchSaga, { __RewireAPI__ as FetchSagaRewireAPI } from './fetchSaga'
import { returnEntireStore } from './fetchReducer'

// TODO: retry
const fetchData = FetchSagaRewireAPI.__get__('fetchData')
const fetchOnce = FetchSagaRewireAPI.__get__('fetchOnce')
const matchesTerminationAction = FetchSagaRewireAPI.__get__('matchesTerminationAction')
const fetchDataRecurring = FetchSagaRewireAPI.__get__('fetchDataRecurring')
const fetchDataLoop = FetchSagaRewireAPI.__get__('fetchDataLoop')

let consoleOutput
const _browserConsoleLog = console.debug

beforeAll(() => {
	console.debug = jest.fn(message => {
		consoleOutput = message
	})
})

afterAll(() => {
	console.debug = _browserConsoleLog
})

describe('fetchData', () => {
	test('should throw without action.modelName', () => {
		const gen = fetchData()
		expect(() => {
			gen.next()
		}).toThrow(/'modelName' config parameter is required/)
	})

	const getOauthToken = () => {return { access_token: 'some-access-token' }}
	let fetchSagaGen
	beforeEach(() => {
		fetchSagaGen = fetchSaga(
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
				}
			},
			'http://google.com',
			getOauthToken,
			() => {} // no need for error logging here
		)
		fetchSagaGen.next()
	})

	// NOTE: first yield PUTs FETCH_REQUESTED
	// second yield is the RACE that does the fetch or times out
	//(unless there is a parameterized path which has one yield before these two)
	test('should throw when action.modelName is not found in models', () => {
		const gen = fetchData({ modelName: 'foo' })
		expect(() => {
			gen.next()
			gen.next()
		}).toThrow(/Cannot find 'foo' model in model dictionary/)
	})

	test('should emit FETCH_REQUESTED', () => {
		const gen = fetchData({ modelName: 'test' })
		expect(gen.next().value).toEqual(
			put(
				createAction(actions.FETCH_REQUESTED, {
					modelName: 'test'
				})
			)
		)
	})

	test('should add oauth token to header if it exists', () => {
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		expect(gen.next().value).toEqual(
			race({
				fetchResult: call(doFetch, {
					path: 'http://www.google.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				}),
				timedOut: call(delay, 3000)
			})
		)
	})

	test('should execute basic fetch', () => {
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		gen.next()
		expect(gen.next({ fetchResult: { foo: 'bar' } }).value).toEqual(
			put(createAction(actions.FETCH_RESULT_RECEIVED, { data: { foo: 'bar' }, modelName: 'test' }))
		)
		expect(gen.next().done).toEqual(true)
	})

	test('should execute basic transient fetch', () => {
		const gen = fetchData({ modelName: 'test', noStore: true })
		gen.next()
		gen.next()
		expect(gen.next({ fetchResult: { foo: 'bar' } }).value).toEqual(
			put(
				createAction(actions.TRANSIENT_FETCH_RESULT_RECEIVED, {
					data: { foo: 'bar' },
					modelName: 'test'
				})
			)
		)
		expect(gen.next().done).toEqual(true)
	})

	test('should replace baseConfig body as string if body is string', () => {
		const gen = fetchData({ modelName: 'test2', body: 'body' })
		gen.next()
		expect(gen.next().value).toEqual(
			race({
				fetchResult: call(doFetch, {
					path: 'http://news.ycombinator.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {},
					body: 'body'
				}),
				timedOut: call(delay, 3000)
			})
		)
	})

	test('should merge body as JSON if body is JSON', () => {
		const gen = fetchData({ modelName: 'test3', body: { baz: 'quux' } })
		gen.next()
		expect(gen.next().value).toEqual(
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
				timedOut: call(delay, 3000)
			})
		)
	})

	test('should populate parameter in path', () => {
		const gen = fetchData({ modelName: 'test4' })
		gen.next()
		gen.next({ testServer: 'baz' })
		expect(gen.next().value).toEqual(
			race({
				fetchResult: call(doFetch, {
					path: 'http://baz',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				}),
				timedOut: call(delay, 3000)
			})
		)
	})

	test('should retry when fetch times out', () => {
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		gen.next()
		expect(gen.next({ timedOut: true }).value).toEqual(
			put(createAction(actions.FETCH_TIMED_OUT, { modelName: 'test' }))
		)
		gen.next()
		expect(gen.next().value).toEqual(
			put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
		)
	})

	test('should not retry when fetch times out and noRetry is specified', () => {
		const gen = fetchData({ modelName: 'test', noRetry: true })
		gen.next()
		gen.next()
		expect(gen.next({ timedOut: true }).value).toEqual(
			put(createAction(actions.FETCH_TIMED_OUT, { modelName: 'test' }))
		)
		gen.next()
		expect(gen.next().done).toEqual(true)
	})

	test('should time out to a configurable value', () => {
		const gen = fetchData({ modelName: 'test', timeLimit: 1000 })
		gen.next()
		expect(gen.next().value).toEqual(
			race({
				fetchResult: call(doFetch, {
					path: 'http://www.google.com',
					headers: { Authorization: 'Bearer some-access-token' },
					queryParams: {}
				}),
				timedOut: call(delay, 1000)
			})
		)
	})

	test('should retry on fetch error', () => {
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		gen.next()
		expect(gen.next({ fetchResult: { title: 'Error' } }).value).toEqual(
			put(
				createAction(actions.FETCH_TRY_FAILED, { modelName: 'test', errorData: { title: 'Error' } })
			)
		)
		gen.next()
		expect(gen.next().value).toEqual(
			put(createAction(actions.FETCH_REQUESTED, { modelName: 'test' }))
		)
	})

	test('should dispatch FETCH_FAILED when all retries have failed', () => {
		const gen = fetchData({ modelName: 'test' })
		for (let i = 0; i <= 3; i++) {
			gen.next()
			gen.next()
			expect(gen.next({ fetchResult: { title: 'Error' } }).value).toEqual(
				put(
					createAction(actions.FETCH_TRY_FAILED, {
						modelName: 'test',
						errorData: { title: 'Error' }
					})
				)
			)
			gen.next()
		}
		expect(gen.next().value).toEqual(put(createAction(actions.FETCH_FAILED, { modelName: 'test' })))
		expect(gen.next().done).toEqual(true)
	})

	test('should not dispatch FETCH_FAILED when all retries were timeouts', () => {
		const gen = fetchData({ modelName: 'test' })
		for (let i = 0; i <= 3; i++) {
			gen.next()
			gen.next()
			expect(gen.next({ timedOut: true }).value).toEqual(
				put(
					createAction(actions.FETCH_TIMED_OUT, {
						modelName: 'test'
					})
				)
			)
			gen.next()
		}

		expect(gen.next().done).toEqual(true)
	})
})

describe('fetchOnce', () => {
	test('should call fetchData exactly once', () => {
		const gen = fetchOnce({ modelName: 'foo' })
		expect(gen.next().value).toEqual(call(fetchData, { modelName: 'foo' }))
		expect(gen.next().done).toEqual(true)
	})
})

describe('fetchDataLoop', () => {
	test('should fetch repeatedly until terminated', () => {
		const gen = fetchDataLoop({ modelName: 'foo', period: 1000 })
		expect(gen.next().value).toEqual(call(fetchData, { modelName: 'foo', period: 1000 }))
		expect(gen.next().value).toEqual(call(delay, 1000))

		expect(gen.next().value).toEqual(call(fetchData, { modelName: 'foo', period: 1000 }))
		expect(gen.next().value).toEqual(call(delay, 1000))

		expect(gen.return().value).toEqual(cancelled())

		expect(gen.next(true).value).toEqual(
			put(
				createAction(actions.PERIODIC_TERMINATION_SUCCEEDED, {
					modelName: 'foo'
				})
			)
		)
		expect(gen.next().done).toEqual(true)
	})
})

describe('fetchDataRecurring', () => {
	test('should throw without action', () => {
		const gen = fetchDataRecurring()
		expect(() => {
			gen.next()
		}).toThrow(/'period' config parameter is required for fetchDataRecurring/)
	})

	test('should throw without action.period', () => {
		const gen = fetchDataRecurring({})
		expect(() => {
			gen.next()
		}).toThrow(/'period' config parameter is required for fetchDataRecurring/)
	})

	test('should throw without action.taskId', () => {
		const gen = fetchDataRecurring({ period: 1000 })
		expect(() => {
			gen.next()
		}).toThrow(/'taskId' config parameter is required for fetchDataRecurring/)
	})

	test('should fork off fetchData loop if all params are given', () => {
		const action = { period: 1000, taskId: 'fooTask' }
		const gen = fetchDataRecurring(action)
		expect(gen.next().value).toEqual(fork(fetchDataLoop, action))
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
		gen.next()
		const mockTask = createMockTask()
		gen.next(mockTask)
		expect(gen.next().value).toEqual(cancel(mockTask))
	})
})

describe('fetchSaga', () => {
	test('should throw without models', () => {
		const gen = fetchSaga()
		expect(() => {
			gen.next()
		}).toThrow(/'modelsParam' is required for fetchSaga/)
	})

	test('should set up all takes', () => {
		const gen = fetchSaga({})

		expect(gen.next().value).toEqual(takeEvery(actions.DATA_REQUESTED, fetchOnce))
		expect(gen.next().value).toEqual(takeEvery(actions.PERIODIC_DATA_REQUESTED, fetchDataRecurring))
		expect(gen.next().value).toEqual(takeLatest(actions.DATA_REQUESTED_USE_LATEST, fetchOnce))
	})

	test('should use default logger', () => {
		const gen = fetchSaga({ test: { path: '/foo' } }, '')
		expect(consoleOutput).toEqual('logger set to consoleLogger')
	})
})
