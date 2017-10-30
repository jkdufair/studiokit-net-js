// @flow

import actions from './actions'
import _ from 'lodash/fp'

import type { Action } from 'redux'

type FetchState = {}

type MetadataState = {
	isFetching: boolean,
	hasError: boolean,
	timedOut: boolean,
	fetchedAt?: Date
}

type ModelState = {
	_metadata: MetadataState
}

function getMetadata(state: FetchState, path: Array<string>): MetadataState {
	return _.get(path.concat('_metadata'), state) || {}
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
	let newValue = _.get(path, state) || {}
	const metadata = getMetadata(state, path)

	switch (action.type) {
		case actions.FETCH_REQUESTED:
			newValue._metadata = Object.assign(metadata, {
				isFetching: true,
				hasError: false,
				timedOut: false
			})
			return _.set(path, newValue, state)

		case actions.FETCH_RESULT_RECEIVED:
			newValue = action.data
			newValue._metadata = Object.assign(metadata, {
				isFetching: false,
				hasError: false,
				timedOut: false,
				fetchedAt: new Date()
			})
			return _.set(path, newValue, state)

		case actions.FETCH_FAILED:
			newValue._metadata = Object.assign(metadata, {
				isFetching: false,
				hasError: true,
				timedOut: !!action.didTimeOut
			})
			return _.set(path, newValue, state)

		case actions.KEY_REMOVAL_REQUESTED:
			return _.unset(path, state)

		default:
			return state
	}
}
