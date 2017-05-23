// @flow

import actions from './actions'
import { fromJS } from 'immutable'
import byString from './utilities'

import type { Action } from 'redux'

type FetchState = {}

type ModelState = {
	isFetching: boolean,
	hasError: boolean,
	timedOut: boolean,
	data?: Object,
	fetchedAt?: Date
}

var createNestedObject = function(base: Object, modelName: string) {
	const names = modelName.split('.')
	for (var i = 0; i < names.length; i++) {
		base = base[names[i]] = base[names[i]] || {}
	}
}

export default function fetchReducer(state: FetchState = {}, action: Action) {
	if (!action.modelName) {
		return state
	}
	const modelName: string = action.modelName

	const newState = {}
	createNestedObject(newState, modelName)
	let leafNode: ModelState = byString(newState, modelName)

	switch (action.type) {
		case actions.FETCH_REQUESTED:
			leafNode.isFetching = true
			leafNode.hasError = false
			leafNode.timedOut = false
			return fromJS(state).mergeDeep(newState).toJS()

		case actions.FETCH_RESULT_RECEIVED:
			leafNode.data = action.data
			leafNode.isFetching = false
			leafNode.hasError = false
			leafNode.timedOut = false
			leafNode.fetchedAt = new Date()
			let path = modelName.split('.')
			path.push('data')
			return fromJS(state).deleteIn(path).mergeDeep(newState).toJS()

		case actions.FETCH_FAILED:
			leafNode.isFetching = false
			leafNode.hasError = true
			leafNode.timedOut = false
			return fromJS(state).mergeDeep(newState).toJS()

		case actions.FETCH_TIMED_OUT:
			leafNode.isFetching = false
			leafNode.hasError = true
			leafNode.timedOut = true
			return fromJS(state).mergeDeep(newState).toJS()

		case actions.KEY_REMOVAL_REQUESTED:
			return fromJS(state).deleteIn(modelName.split('.')).toJS()

		default:
			return state
	}
}
