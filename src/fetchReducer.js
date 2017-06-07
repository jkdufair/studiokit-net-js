// @flow

import actions from './actions'
import _ from 'lodash'

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
	const newState = _.set({}, modelName, {})
	// leafNode is a reference to the model at the (potentially) nested path referenced by modelName
	let leafNode: ModelState = _.get(newState, modelName)

	switch (action.type) {
		case actions.FETCH_REQUESTED:
			leafNode.isFetching = true
			leafNode.hasError = false
			leafNode.timedOut = false
			return _.merge({}, state, newState)

		case actions.FETCH_RESULT_RECEIVED:
			leafNode.data = action.data
			leafNode.isFetching = false
			leafNode.hasError = false
			leafNode.timedOut = false
			leafNode.fetchedAt = new Date()
			let path = modelName.split('.')
			path.push('data')
			// Do not delete and re-add the data. Just replace it when this action is received
			return _.merge({}, _.omit(state, path), newState)

		case actions.FETCH_FAILED:
			leafNode.isFetching = false
			leafNode.hasError = true
			leafNode.timedOut = false
			return _.merge({}, state, newState)

		case actions.FETCH_TIMED_OUT:
			leafNode.isFetching = false
			leafNode.hasError = true
			leafNode.timedOut = true
			return _.merge({}, state, newState)

		case actions.KEY_REMOVAL_REQUESTED:
			return _.omit(state, modelName)

		default:
			return state
	}
}
