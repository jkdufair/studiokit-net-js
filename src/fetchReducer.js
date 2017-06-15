// @flow

import actions from './actions'
import _ from 'lodash/fp'

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
	const path: Array<string> = action.modelName.split('.')
	const newValue = {}
	newValue.data = _.get(_.union(['data'], path), state)

	switch (action.type) {
		case actions.FETCH_REQUESTED:
			newValue.isFetching = true
			newValue.hasError = false
			newValue.timedOut = false
			return _.set(path, newValue, state)

		case actions.FETCH_RESULT_RECEIVED:
			newValue.data = action.data
			newValue.isFetching = false
			newValue.hasError = false
			newValue.timedOut = false
			newValue.fetchedAt = new Date()
			return _.set(path, newValue, state)

		case actions.FETCH_FAILED:
			newValue.isFetching = false
			newValue.hasError = true
			newValue.timedOut = false
			return _.set(path, newValue, state)

		case actions.FETCH_TIMED_OUT:
			newValue.isFetching = false
			newValue.hasError = true
			newValue.timedOut = true
			return _.set(path, newValue, state)

		case actions.KEY_REMOVAL_REQUESTED:
			return _.omit(path, state)

		default:
			return state
	}
}
