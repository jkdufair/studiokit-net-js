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

/**
 * Given an object, add keys matching the path in modelName.
 * Matching keys will be overwritten
 * 
 * 'foo.bar.baz' generates
 * {
 * 	foo: {
 * 		bar: {
 * 			baz: {
 * 			}
 * 		}
 * 	}
 * }
 * 
 * This function mutates the object. Immutablility coming!
 * 
 * @param {Object} base - An existing object
 * @param {string} modelName - The period-separated path to the model, i.e. 'foo.bar.baz'
 */
var createNestedObject = function(base: Object, modelName: string) {
	const names = modelName.split('.')
	for (var i = 0; i < names.length; i++) {
		base = base[names[i]] = base[names[i]] || {}
	}
}

/**
 * Reducer for fetching. Fetching state updated with every action. Data updated on result received.
 * Data and fetchedDate NOT deleted on failed request. All data at key removed on KEY_REMOVAL_REQUESTED
 * All actions require a modelName key to function with this reducer
 * 
 * 
 * @export
 * @param {FetchState} [state={}] - The state of the models. Initially empty
 * @param {Action} action - The action upon which we dispatch
 * @returns 
 */
export default function fetchReducer(state: FetchState = {}, action: Action) {
	if (!action.modelName) {
		return state
	}
	const modelName: string = action.modelName

	const newState = {}
	createNestedObject(newState, modelName)
	// leafNode is a reference to the model at the (potentially) nested path referenced by modelName
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
			// Do not delete and re-add the data. Just replace it when this action is received
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
