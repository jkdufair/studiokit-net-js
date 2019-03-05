import rewire from 'rewire'
import actions from './actions'
import { takeEvery } from 'redux-saga/effects'
import * as uuid from 'uuid'
import noStoreSaga, { registerNoStoreActionHook, unregisterNoStoreActionHook } from './noStoreSaga'

const NoStoreSagaRewireAPI = rewire('./noStoreSaga')
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
					noStore: true,
				})
			).toEqual(true)
		})
		test('matchesNoStoreAction does not match when `noStore` is `false`', () => {
			expect(
				matchesNoStoreAction({
					modelName: 'someModel',
					type: actions.DATA_REQUESTED,
				})
			).toEqual(false)
		})
		test('matchesNoStoreAction does not match incorrect action types', () => {
			expect(
				matchesNoStoreAction({
					modelName: 'someModel',
					type: actions.KEY_REMOVAL_REQUESTED,
					noStore: true,
				})
			).toEqual(false)
		})
		test('should call matchesNoStoreAction from takeMatchesNoStoreAction', () => {
			expect(
				takeMatchesNoStoreAction()({
					modelName: 'someModel',
					type: actions.DATA_REQUESTED,
					noStore: true,
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
						guid,
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
						guid,
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
						guid: uuid.v4(),
					},
					{ modelName: 'someModel', noStore: true, guid: uuid.v4() }
				)
			).toEqual(false)
		})
		test('should call matchesFailedNoStoreHookAction from takeMatchesFailedNoStoreHookAction', () => {
			const guid = uuid.v4()
			expect(
				takeMatchesFailedNoStoreHookAction({ modelName: 'someModel', noStore: true, guid })(
					{
						modelName: 'someModel',
						type: actions.TRANSIENT_FETCH_FAILED,
						guid,
					}
				)
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
						guid,
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
						guid,
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
						guid: uuid.v4(),
					},
					{ modelName: 'someModel', noStore: true, guid: uuid.v4() }
				)
			).toEqual(false)
		})
		test('should call matchesReceivedNoStoreHookAction from takeMatchesReceivedNoStoreHookAction', () => {
			const guid = uuid.v4()
			expect(
				takeMatchesReceivedNoStoreHookAction({
					modelName: 'someModel',
					noStore: true,
					guid,
				})({
					modelName: 'someModel',
					type: actions.TRANSIENT_FETCH_RESULT_RECEIVED,
					guid,
				})
			).toEqual(true)
		})
	})
})

describe('noStoreSaga', () => {
	test('should set up takeEvery', () => {
		const gen = noStoreSaga()
		const takeEveryEffect = gen.next()
		expect(takeEveryEffect.value).toEqual(takeEvery(takeMatchesNoStoreAction, handleAction))
	})
})

describe('registerNoStoreActionHook', () => {
	test('should succeed', () => {
		const hook = () => {
			const foo = 1
		}
		registerNoStoreActionHook('key', hook)
		expect(hooks.key).toEqual(hook)
	})
})

describe('unregisterNoStoreActionHook', () => {
	test('should succeed', () => {
		const hook = () => {
			const foo = 1
		}
		registerNoStoreActionHook('key', hook)
		expect(hooks.key).toEqual(hook)
		unregisterNoStoreActionHook('key')
		expect(hooks.key).toEqual(undefined)
	})
})

describe('handleAction', () => {
	const firstKey = uuid.v4()
	const secondKey = uuid.v4()
	let hookCalled: string | undefined
	let hookData: any
	const firstHook = (data: any) => {
		hookCalled = 'first'
		hookData = data
	}
	const secondHook = (data: any) => {
		hookCalled = 'second'
		hookData = data
	}

	beforeEach(() => {
		registerNoStoreActionHook(firstKey, firstHook)
		registerNoStoreActionHook(secondKey, secondHook)
	})

	afterEach(() => {
		unregisterNoStoreActionHook(firstKey)
		unregisterNoStoreActionHook(secondKey)
		hookCalled = undefined
		hookData = undefined
	})

	test('should call correct hook with `data` on success', () => {
		const action = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: firstKey,
		}
		const gen = handleAction(action)
		gen.next() // raceEffect
		const sagaDone = gen.next({
			receivedResult: { data: 'blah' },
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
			guid: firstKey,
		}
		const gen = handleAction(firstAction)
		gen.next() // raceEffect
		const sagaDone = gen.next({
			receivedResult: { data: 'blah' },
		})
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual('first')
		expect(hookData).toEqual('blah')

		const secondAction = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: secondKey,
		}
		const gen2 = handleAction(secondAction)
		gen2.next() // raceEffect2
		const sagaDone2 = gen2.next({
			receivedResult: { data: 'bloo' },
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
			guid: firstKey,
		}
		const gen = handleAction(action)
		gen.next() // raceEffect
		const sagaDone = gen.next({
			failedResult: { error: 'boo' },
		})
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual('first')
		expect(hookData).toEqual(null)
	})

	test('should finish if no `guid` on action', () => {
		const action = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
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
			guid: uuid.v4(),
		}
		const gen = handleAction(action)
		const sagaDone = gen.next()
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual(undefined)
		expect(hookData).toEqual(undefined)
	})

	test('should not call if hook is unregistered while requesting', () => {
		const action = {
			modelName: 'someModel',
			type: actions.DATA_REQUESTED,
			noStore: true,
			guid: firstKey,
		}
		const gen = handleAction(action)
		gen.next() // raceEffect
		unregisterNoStoreActionHook(firstKey)
		const sagaDone = gen.next({
			receivedResult: { data: 'blah' },
		})
		expect(sagaDone.done).toEqual(true)
		expect(hookCalled).toEqual(undefined)
		expect(hookData).toEqual(undefined)
	})
})
