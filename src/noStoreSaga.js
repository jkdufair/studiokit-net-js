// @flow

import _ from 'lodash'
import { take, takeEvery, race } from 'redux-saga/effects'
import actions from './actions'
import type { FetchAction, FetchError } from './types'
type HookFunction = any => void

//#region Helpers

const matchesNoStoreAction = incomingAction => {
	return incomingAction.type === actions.DATA_REQUESTED && incomingAction.noStore === true
}

const takeMatchesNoStoreAction = () => incomingAction => matchesNoStoreAction(incomingAction)

const matchesFailedNoStoreHookAction = (incomingAction, fetchAction) => {
	return (
		incomingAction.type === actions.TRANSIENT_FETCH_FAILED &&
		fetchAction.noStore === true &&
		incomingAction.guid === fetchAction.guid
	)
}

const takeMatchesFailedNoStoreHookAction = action => incomingAction =>
	matchesFailedNoStoreHookAction(incomingAction, action)

const matchesReceivedNoStoreHookAction = (incomingAction, fetchAction) => {
	return (
		incomingAction.type === actions.TRANSIENT_FETCH_RESULT_RECEIVED &&
		fetchAction.noStore === true &&
		incomingAction.guid === fetchAction.guid
	)
}

const takeMatchesReceivedNoStoreHookAction = action => incomingAction =>
	matchesReceivedNoStoreHookAction(incomingAction, action)

//#endregion Helpers

//#region Hooks

const hooks: { [string]: HookFunction } = {}

export const registerNoStoreSagaHook = (key: string, hook: HookFunction) => {
	hooks[key] = hook
}

export const unregisterNoStoreSagaHook = (key: string, hook: HookFunction) => {
	delete hooks[key]
}

//#endregion Hooks

function* handleAction(action: FetchAction) {
	const guid = action.guid
	if (_.isNil(guid)) return
	const hook = hooks[guid]
	if (_.isNil(hook)) return

	const { receivedResult, failedResult } = yield race({
		receivedResult: take(takeMatchesReceivedNoStoreHookAction(action)),
		failedResult: take(takeMatchesFailedNoStoreHookAction(action))
	})

	if (!receivedResult || !receivedResult.data || !!failedResult) {
		hook(null)
		return
	}
	hook(receivedResult.data)
}

export default function* noStoreSaga(): Generator<*, *, *> {
	yield takeEvery(takeMatchesNoStoreAction, handleAction)
}
