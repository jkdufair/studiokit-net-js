import fetchSaga from './fetchSaga'
import { __RewireAPI__ as FetchSagaRewireAPI } from './fetchSaga'
import actions from './actions'
import { cancel, take, fork } from 'redux-saga/effects'
import { createMockTask } from 'redux-saga/utils'

// TODO: retry
const fetchData = FetchSagaRewireAPI.__get__('fetchData')
const fetchOnce = FetchSagaRewireAPI.__get__('fetchOnce')
const fetchDataRecurring = FetchSagaRewireAPI.__get__('fetchDataRecurring')
const fetchDataLoop = FetchSagaRewireAPI.__get__('fetchDataLoop')
const interceptOauthToken = FetchSagaRewireAPI.__get__('interceptOauthToken')

describe('fetchData', () => {
	test('should throw without action.modelName', () => {
		const gen = fetchData()
		expect(() => {
			gen.next()
		}).toThrow(/'modelName' config parameter is required/)
	})

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
		const r1 = gen.next()
		expect(r1.value.PUT.action).toEqual({ type: actions.FETCH_REQUESTED, modelName: 'test' })
	})

	test('should add oauth token to header if it exists', () => {
		interceptOauthToken({ oauthToken: { access_token: 'some-access-token' } })
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		const result = gen.next()
		expect(result.value.RACE.fetchResult.CALL.args[0].headers).toEqual({
			Authorization: 'Bearer some-access-token'
		})
		interceptOauthToken({ oauthToken: undefined })
	})

	test('should execute basic fetch', () => {
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		gen.next()
		const result = gen.next({ fetchResult: { foo: 'bar' } })
		expect(result.value.PUT.action).toEqual({
			type: actions.FETCH_RESULT_RECEIVED,
			data: { foo: 'bar' },
			modelName: 'test'
		})
		const doneResult = gen.next()
		expect(doneResult.done).toEqual(true)
	})

	test('should execute basic transient fetch', () => {
		const gen = fetchData({ modelName: 'test', noStore: true })
		gen.next()
		gen.next()
		const result = gen.next({ fetchResult: { foo: 'bar' } })
		expect(result.value.PUT.action).toEqual({
			type: actions.TRANSIENT_FETCH_RESULT_RECEIVED,
			data: { foo: 'bar' },
			modelName: 'test'
		})
		const doneResult = gen.next()
		expect(doneResult.done).toEqual(true)
	})

	test('should replace baseConfig body as string if body is string', () => {
		const gen = fetchData({ modelName: 'test2', body: 'body' })
		gen.next()
		const result = gen.next()
		expect(result.value.RACE.fetchResult.CALL.args[0].body).toEqual('body')
	})

	test('should merge body as JSON if body is JSON', () => {
		const gen = fetchData({ modelName: 'test3', body: { baz: 'quux' } })
		gen.next()
		const result = gen.next()
		expect(result.value.RACE.fetchResult.CALL.args[0].body).toEqual({
			foo: 'bar',
			baz: 'quux'
		})
	})

	test('should populate parameter in path', () => {
		const gen = fetchData({ modelName: 'test4' })
		gen.next()
		gen.next({ testServer: 'baz' })
		const result = gen.next({ fetchResult: { foo: 'bar' } })
		expect(result.value.RACE.fetchResult.CALL.args[0].path).toEqual('http://baz')
	})

	test('should return entire store for parameter replacement', () => {
		const gen = fetchData({ modelName: 'test4' })
		const result = gen.next()
		const result2 = result.value.SELECT.selector({ foo: 'bar' })
		expect(result2).toEqual({ foo: 'bar' })
	})

	test('should retry when fetch times out', () => {
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		gen.next()
		const result = gen.next({ timedOut: true })
		expect(result.value.PUT.action).toEqual({ type: actions.FETCH_TIMED_OUT, modelName: 'test' })
		gen.next()
		expect(gen.next().value.PUT.action).toEqual({
			type: actions.FETCH_REQUESTED,
			modelName: 'test'
		})
	})

	test('should not retry when fetch times out and noRetry is specified', () => {
		const gen = fetchData({ modelName: 'test', noRetry: true })
		gen.next()
		gen.next()
		const result = gen.next({ timedOut: true })
		expect(result.value.PUT.action).toEqual({ type: actions.FETCH_TIMED_OUT, modelName: 'test' })
		gen.next()
		expect(gen.next().done).toEqual(true)
	})

	test('should time out to a configurable value', () => {
		const gen = fetchData({ modelName: 'test', timeLimit: 1000 })
		gen.next()
		expect(gen.next().value.RACE.timedOut.CALL.args[0]).toEqual(1000)
	})

	test('should retry on fetch error', () => {
		const gen = fetchData({ modelName: 'test' })
		gen.next()
		gen.next()
		const result = gen.next({ fetchResult: { title: 'Error' } })
		expect(result.value.PUT.action).toEqual({
			type: 'net/FETCH_TRY_FAILED',
			modelName: 'test',
			errorData: { title: 'Error' }
		})
		gen.next()
		expect(gen.next().value.PUT.action).toEqual({
			type: 'net/FETCH_REQUESTED',
			modelName: 'test'
		})
	})

	test('should dispatch when all retries have failed', () => {
		const gen = fetchData({ modelName: 'test' })
		for (let i = 0; i <= 3; i++) {
			gen.next()
			gen.next()
			const result = gen.next({ fetchResult: { title: 'Error' } })
			expect(result.value.PUT.action).toEqual({
				type: 'net/FETCH_TRY_FAILED',
				modelName: 'test',
				errorData: { title: 'Error' }
			})
			gen.next()
		}
		expect(gen.next().value.PUT.action).toEqual({ type: actions.FETCH_FAILED, modelName: 'test' })
		gen.next()
	})
})

describe('fetchOnce', () => {
	test('should call fetchData exactly once', () => {
		const gen = fetchOnce({ modelName: 'foo' })
		const result = gen.next()
		expect(result.value.CALL.fn.name).toEqual('fetchData')
		expect(result.value.CALL.args[0]).toEqual({ modelName: 'foo' })
		expect(gen.next().done).toEqual(true)
	})
})

describe('fetchDataLoop', () => {
	test('should fetch repeatedly until terminated', () => {
		const gen = fetchDataLoop({ modelName: 'foo', period: 1000 })
		let result = gen.next()
		expect(result.value.CALL.fn.name).toEqual('fetchData')
		expect(result.value.CALL.args[0]).toEqual({ modelName: 'foo', period: 1000 })
		result = gen.next()
		expect(result.value.CALL.fn.name).toEqual('delay')
		expect(result.value.CALL.args[0]).toEqual(1000)

		result = gen.next()
		expect(result.value.CALL.fn.name).toEqual('fetchData')
		expect(result.value.CALL.args[0]).toEqual({ modelName: 'foo', period: 1000 })
		result = gen.next()
		expect(result.value.CALL.fn.name).toEqual('delay')
		expect(result.value.CALL.args[0]).toEqual(1000)

		result = gen.return() // cancel task
		expect(result.value.PUT.action).toEqual(actions.PERIODIC_TERMINATION_SUCCEEDED)
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
		const action = { period: 1000, taskId: 'fooTask' }
		const gen = fetchDataRecurring(action)
		gen.next()
		const result = gen.next(createMockTask())
		expect(result.value.TAKE.pattern({ type: 'foo' })).toEqual(false)
	})

	test('should not cancel if action is a cancel for another task', () => {
		const action = { period: 1000, taskId: 'fooTask' }
		const gen = fetchDataRecurring(action)
		gen.next()
		const result = gen.next(createMockTask())
		expect(
			result.value.TAKE.pattern({
				type: actions.PERIODIC_TERMINATION_REQUESTED,
				taskId: 'someOtherTask'
			})
		).toEqual(false)
	})

	test('should cancel if action is a cancel for that task', () => {
		const action = { period: 1000, taskId: 'fooTask' }
		const gen = fetchDataRecurring(action)
		gen.next()
		const mockTask = createMockTask()
		const result = gen.next(mockTask)
		expect(
			result.value.TAKE.pattern({
				type: actions.PERIODIC_TERMINATION_REQUESTED,
				taskId: 'fooTask'
			})
		).toEqual(true)
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

		const result1 = gen.next()
		expect(result1.value.FORK.args[0]).toEqual(actions.DATA_REQUESTED)
		expect(result1.value.FORK.args[1].name).toEqual('fetchOnce')

		const result2 = gen.next()
		expect(result2.value.FORK.args[0]).toEqual(actions.PERIODIC_DATA_REQUESTED)
		expect(result2.value.FORK.args[1].name).toEqual('fetchDataRecurring')

		const result3 = gen.next()
		expect(result3.value.FORK.args[0]).toEqual(actions.DATA_REQUESTED_USE_LATEST)
		expect(result3.value.FORK.args[1].name).toEqual('fetchOnce')

		const result4 = gen.next()
		expect(result4.value.FORK.args[0]).toEqual('auth/GET_TOKEN_SUCCEEDED')
		expect(result4.value.FORK.args[1].name).toEqual('interceptOauthToken')

		const result5 = gen.next()
		expect(result5.value.FORK.args[0]).toEqual('auth/TOKEN_REFRESH_SUCCEEDED')
		expect(result5.value.FORK.args[1].name).toEqual('interceptOauthToken')
	})

	test('should use default logger', () => {
		const gen = fetchSaga({ test: { path: '/foo' } }, '')
		gen.next()
		const gen2 = fetchData({ modelName: 'test' })
		gen2.next()
		gen2.next()
		const result = gen2.next({ fetchResult: { title: 'Error' } })
		expect(result.value.PUT.action).toEqual({
			type: 'net/FETCH_TRY_FAILED',
			modelName: 'test',
			errorData: { title: 'Error' }
		})
		gen2.next()
		expect(gen2.next().value.PUT.action).toEqual({
			type: 'net/FETCH_REQUESTED',
			modelName: 'test'
		})
	})
})
