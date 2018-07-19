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
import uuid from 'uuid'
import noStoreSaga, {
	registerNoStoreSagaHook,
	unregisterNoStoreSagaHook,
	__RewireAPI__ as NoStoreSagaRewireAPI
} from '../src/noStoreSaga'

const matchesNoStoreAction = NoStoreSagaRewireAPI.__get__('matchesNoStoreAction')
const takeMatchesNoStoreAction = NoStoreSagaRewireAPI.__get__('takeMatchesNoStoreAction')
const matchesFailedNoStoreHookAction = NoStoreSagaRewireAPI.__get__(
	'matchesFailedNoStoreHookAction'
)
const takeMatchesFailedNoStoreHookAction = NoStoreSagaRewireAPI.__get__(
	'takeMatchesFailedNoStoreHookAction'
)
const matchesReceivedNoStoreHookAction = NoStoreSagaRewireAPI.__get__(
	'matchesReceivedNoStoreHookAction'
)
const takeMatchesReceivedNoStoreHookAction = NoStoreSagaRewireAPI.__get__(
	'takeMatchesReceivedNoStoreHookAction'
)
const hooks = NoStoreSagaRewireAPI.__get__('hooks')
const handleAction = NoStoreSagaRewireAPI.__get__('handleAction')

describe('helpers', () => {
	describe('matchesNoStoreAction', () => {
		test('matchesNoStoreAction matches correctly', () => {
			expect(
				matchesNoStoreAction({
					modelName: 'someModel',
					type: actions.DATA_REQUESTED,
					noStore: true
				})
			).toEqual(true)
		})
		test('matchesNoStoreAction does not match when `noStore` is `false`', () => {
			expect(
				matchesNoStoreAction({
					modelName: 'someModel',
					type: actions.DATA_REQUESTED
				})
			).toEqual(false)
		})
		test('matchesNoStoreAction does not match incorrect action types', () => {
			expect(
				matchesNoStoreAction({
					modelName: 'someModel',
					type: actions.KEY_REMOVAL_REQUESTED,
					noStore: true
				})
			).toEqual(false)
		})
		test('should call matchesNoStoreAction from takeMatchesNoStoreAction', () => {
			expect(
				takeMatchesNoStoreAction()({
					modelName: 'someModel',
					type: actions.DATA_REQUESTED,
					noStore: true
				})
			).toEqual(true)
		})
	})

	describe('matchesFailedNoStoreHookAction', () => {
		test('matchesFailedNoStoreHookAction matches correctly', () => {
			const guid = uuid.v4()
			expect(
				matchesFailedNoStoreHookAction(
					{
						modelName: 'someModel',
						type: actions.TRANSIENT_FETCH_FAILED,
						guid
					},
					{ modelName: 'someModel', noStore: true, guid }
				)
			).toEqual(true)
		})
		test('matchesFailedNoStoreHookAction does not match incorrect action types', () => {
			const guid = uuid.v4()
			expect(
				matchesFailedNoStoreHookAction(
					{
						modelName: 'someModel',
						type: actions.KEY_REMOVAL_REQUESTED,
						guid
					},
					{ modelName: 'someModel', noStore: true, guid }
				)
			).toEqual(false)
		})
		test('matchesFailedNoStoreHookAction does not match incorrect `guid`', () => {
			expect(
				matchesFailedNoStoreHookAction(
					{
						modelName: 'someModel',
						type: actions.TRANSIENT_FETCH_FAILED,
						guid: uuid.v4()
					},
					{ modelName: 'someModel', noStore: true, guid: uuid.v4() }
				)
			).toEqual(false)
		})
		test('should call matchesFailedNoStoreHookAction from takeMatchesFailedNoStoreHookAction', () => {
			const guid = uuid.v4()
			expect(
				takeMatchesFailedNoStoreHookAction({ modelName: 'someModel', noStore: true, guid })({
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_FAILED,
					guid
				})
			).toEqual(true)
		})
	})

	describe('matchesReceivedNoStoreHookAction', () => {
		test('matchesReceivedNoStoreHookAction matches correctly', () => {
			const guid = uuid.v4()
			expect(
				matchesReceivedNoStoreHookAction(
					{
						modelName: 'someModel',
						type: actions.TRANSIENT_FETCH_RESULT_RECEIVED,
						guid
					},
					{ modelName: 'someModel', noStore: true, guid }
				)
			).toEqual(true)
		})
		test('matchesReceivedNoStoreHookAction does not match incorrect action types', () => {
			const guid = uuid.v4()
			expect(
				matchesReceivedNoStoreHookAction(
					{
						modelName: 'someModel',
						type: actions.KEY_REMOVAL_REQUESTED,
						guid
					},
					{ modelName: 'someModel', noStore: true, guid }
				)
			).toEqual(false)
		})
		test('matchesReceivedNoStoreHookAction does not match incorrect `guid`', () => {
			expect(
				matchesReceivedNoStoreHookAction(
					{
						modelName: 'someModel',
						type: actions.TRANSIENT_FETCH_FAILED,
						guid: uuid.v4()
					},
					{ modelName: 'someModel', noStore: true, guid: uuid.v4() }
				)
			).toEqual(false)
		})
		test('should call matchesReceivedNoStoreHookAction from takeMatchesReceivedNoStoreHookAction', () => {
			const guid = uuid.v4()
			expect(
				takeMatchesReceivedNoStoreHookAction({ modelName: 'someModel', noStore: true, guid })({
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_RESULT_RECEIVED,
					guid
				})
			).toEqual(true)
		})
	})
})

describe('noStoreSaga', () => {
	test('should set up takeEvery', () => {
		const gen = noStoreSaga({})
		const takeEveryEffect = gen.next()
		expect(takeEveryEffect.value).toEqual(takeEvery(takeMatchesNoStoreAction, handleAction))
	})
})

describe('registerNoStoreSagaHook', () => {
	test('should succeed', () => {
		const hook = data => {
			let foo = 1
		}
		registerNoStoreSagaHook('key', hook)
		expect(hooks['key']).toEqual(hook)
	})
})

describe('unregisterNoStoreSagaHook', () => {
	test('should succeed', () => {
		const hook = data => {
			let foo = 1
		}
		registerNoStoreSagaHook('key', hook)
		expect(hooks['key']).toEqual(hook)
		unregisterNoStoreSagaHook('key')
		expect(hooks['key']).toEqual(undefined)
	})
})

describe('handleAction', () => {
	const firstKey = uuid.v4()
	const secondKey = uuid.v4()
	let hookCalled
	let hookData
	const firstHook = data => {
		hookCalled = 'first'
		hookData = data
	}
	const secondHook = data => {
		hookCalled = 'second'
		hookData = data
	}

	beforeEach(() => {
		registerNoStoreSagaHook(firstKey, firstHook)
		registerNoStoreSagaHook(secondKey, secondHook)
	})

	afterEach(() => {
		unregisterNoStoreSagaHook(firstKey)
		unregisterNoStoreSagaHook(secondKey)
		hookCalled = undefined
		hookData = undefined
	})

	test('should call correct hook with `data` on success', () => {
		const action = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: firstKey
		}
		const gen = handleAction(action)
		const raceEffect = gen.next()
		const sagaDone = gen.next({
			receivedResult: { data: 'blah' }
		})
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual('first')
		expect(hookData).toEqual('blah')
	})

	test('should call two different hooks with `data` on success', () => {
		const firstAction = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: firstKey
		}
		const gen = handleAction(firstAction)
		const raceEffect = gen.next()
		const sagaDone = gen.next({
			receivedResult: { data: 'blah' }
		})
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual('first')
		expect(hookData).toEqual('blah')

		const secondAction = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: secondKey
		}
		const gen2 = handleAction(secondAction)
		const raceEffect2 = gen2.next()
		const sagaDone2 = gen2.next({
			receivedResult: { data: 'bloo' }
		})
		expect(sagaDone2.done).toEqual(true)
		expect(hookCalled).toEqual('second')
		expect(hookData).toEqual('bloo')
	})

	test('should call correct hook with `null` on failure', () => {
		const action = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: firstKey
		}
		const gen = handleAction(action)
		const raceEffect = gen.next()
		const sagaDone = gen.next({
			failedResult: { error: 'boo' }
		})
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual('first')
		expect(hookData).toEqual(null)
	})

	test('should finish if no `guid` on action', () => {
		const action = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true
		}
		const gen = handleAction(action)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual(undefined)
		expect(hookData).toEqual(undefined)
	})

	test('should finish if no hook found for action', () => {
		const action = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: uuid.v4()
		}
		const gen = handleAction(action)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual(undefined)
		expect(hookData).toEqual(undefined)
	})
})
