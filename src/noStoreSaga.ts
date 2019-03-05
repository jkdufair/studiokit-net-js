import _ from 'lodash'
import { take, takeEvery, race } from 'redux-saga/effects'
import actions from './actions'
import { SagaIterator } from '@redux-saga/core'

type HookFunction = (input: any) => void

//#region Helpers

const matchesNoStoreAction = (incomingAction: any) => {
	return incomingAction.type === actions.DATA_REQUESTED && incomingAction.noStore === true
}

const takeMatchesNoStoreAction = () => (incomingAction: any) => matchesNoStoreAction(incomingAction)

const matchesFailedNoStoreHookAction = (incomingAction: any, fetchAction: any) => {
	return (
		incomingAction.type === actions.TRANSIENT_FETCH_FAILED &&
		fetchAction.noStore === true &&
		incomingAction.guid === fetchAction.guid
	)
}

const takeMatchesFailedNoStoreHookAction = (action: any) => (incomingAction: any) =>
	matchesFailedNoStoreHookAction(incomingAction, action)

const matchesReceivedNoStoreHookAction = (incomingAction: any, fetchAction: any) => {
	return (
		incomingAction.type === actions.TRANSIENT_FETCH_RESULT_RECEIVED &&
		fetchAction.noStore === true &&
		incomingAction.guid === fetchAction.guid
	)
}

const takeMatchesReceivedNoStoreHookAction = (action: any) => (incomingAction: any) =>
	matchesReceivedNoStoreHookAction(incomingAction, action)

//#endregion Helpers

//#region Hooks

const hooks: { [key: string]: HookFunction } = {}

export const registerNoStoreActionHook = (key: string, hook: HookFunction) => {
	hooks[key] = hook
}

export const unregisterNoStoreActionHook = (key: string) => {
	delete hooks[key]
}

//#endregion Hooks

function* handleAction(action: any): SagaIterator {
	const guid = action.guid
	if (_.isNil(guid)) {
		return
	}
	if (_.isNil(hooks[guid])) {
		return
	}

	const { receivedResult, failedResult } = yield race({
		receivedResult: take(takeMatchesReceivedNoStoreHookAction(action)),
		failedResult: take(takeMatchesFailedNoStoreHookAction(action)),
	})

	const hook = hooks[guid]
	if (_.isNil(hook)) {
		return
	}

	if (!receivedResult || !receivedResult.data || !!failedResult) {
		hook(null)
		return
	}
	hook(receivedResult.data)
}

export default function* noStoreSaga(): SagaIterator {
	yield takeEvery(takeMatchesNoStoreAction(), handleAction)
}
