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
	registerHook,
	unregisterHook,
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

	test('matchesFailedNoStoreHookAction matches correctly', () => {
		const guid = uuid.v4()
		expect(
			matchesFailedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_FAILED,
					noStore: true,
					guid
				},
				{ guid }
			)
		).toEqual(true)
	})
	test('matchesFailedNoStoreHookAction does not match when `noStore` is `false`', () => {
		const guid = uuid.v4()
		expect(
			matchesFailedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_FAILED,
					guid
				},
				{ guid }
			)
		).toEqual(false)
	})
	test('matchesFailedNoStoreHookAction does not match incorrect action types', () => {
		const guid = uuid.v4()
		expect(
			matchesFailedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.KEY_REMOVAL_REQUESTED,
					noStore: true,
					guid
				},
				{ guid }
			)
		).toEqual(false)
	})
	test('matchesFailedNoStoreHookAction does not match incorrect `guid`', () => {
		expect(
			matchesFailedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_FAILED,
					noStore: true,
					guid: uuid.v4()
				},
				{ guid: uuid.v4() }
			)
		).toEqual(false)
	})
	test('should call matchesFailedNoStoreHookAction from takeMatchesFailedNoStoreHookAction', () => {
		const guid = uuid.v4()
		expect(
			takeMatchesFailedNoStoreHookAction({ guid })({
				modelName: 'someModel',
				type: actions.TRANSIENT_FETCH_FAILED,
				noStore: true,
				guid
			})
		).toEqual(true)
	})

	test('matchesReceivedNoStoreHookAction matches correctly', () => {
		const guid = uuid.v4()
		expect(
			matchesReceivedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_RESULT_RECEIVED,
					noStore: true,
					guid
				},
				{ guid }
			)
		).toEqual(true)
	})
	test('matchesReceivedNoStoreHookAction does not match when `noStore` is `false`', () => {
		const guid = uuid.v4()
		expect(
			matchesReceivedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_RESULT_RECEIVED,
					guid
				},
				{ guid }
			)
		).toEqual(false)
	})
	test('matchesReceivedNoStoreHookAction does not match incorrect action types', () => {
		const guid = uuid.v4()
		expect(
			matchesReceivedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.KEY_REMOVAL_REQUESTED,
					noStore: true,
					guid
				},
				{ guid }
			)
		).toEqual(false)
	})
	test('matchesReceivedNoStoreHookAction does not match incorrect `guid`', () => {
		expect(
			matchesReceivedNoStoreHookAction(
				{
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_FAILED,
					noStore: true,
					guid: uuid.v4()
				},
				{ guid: uuid.v4() }
			)
		).toEqual(false)
	})
	test('should call matchesReceivedNoStoreHookAction from takeMatchesReceivedNoStoreHookAction', () => {
		const guid = uuid.v4()
		expect(
			takeMatchesReceivedNoStoreHookAction({ guid })({
				modelName: 'someModel',
				type: actions.TRANSIENT_FETCH_RESULT_RECEIVED,
				noStore: true,
				guid
			})
		).toEqual(true)
	})
})

describe('noStoreSaga', () => {
	test('should set up takeEvery', () => {
		const gen = noStoreSaga({})
		const takeEveryEffect = gen.next()
		expect(takeEveryEffect.value).toEqual(takeEvery(takeMatchesNoStoreAction, handleAction))
	})
})

describe('registerHook', () => {
	test('should succeed', () => {
		const hook = data => {
			let foo = 1
		}
		registerHook('key', hook)
		expect(hooks['key']).toEqual(hook)
	})
})

describe('unregisterHook', () => {
	test('should succeed', () => {
		const hook = data => {
			let foo = 1
		}
		registerHook('key', hook)
		expect(hooks['key']).toEqual(hook)
		unregisterHook('key')
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
		registerHook(firstKey, firstHook)
		registerHook(secondKey, secondHook)
	})

	afterEach(() => {
		unregisterHook(firstKey)
		unregisterHook(secondKey)
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
