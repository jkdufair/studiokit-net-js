// @flow

import actions from './actions'
import _ from 'lodash'
import _fp from 'lodash/fp'

import type { Action } from 'redux'

type FetchState = {}

type FetchError = {
	modelName: string,
	errorData: {
		didTimeOut: boolean
	}
}

type MetadataState = {
	isFetching: boolean,
	hasError: boolean,
	lastFetchError: FetchError,
	timedOut: boolean,
	fetchedAt?: Date
}

type ModelState = {
	_metadata: MetadataState
}

function getMetadata(state: FetchState, path: Array<string>): MetadataState {
	return _.merge({}, _.get(state, path.concat('_metadata')))
}

function convertArrayToObject(state) {
	_.forEach(state, function(value, key) {
		if (_.isObject(value)) {
			convertArrayToObject(value)
		}
		if (_.isArray(value)) {
			const val = _.keyBy(value, 'id')
			state[key] = val
		}
	})
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
	let path: Array<string> = action.modelName.split('.')
	let newValue = _.merge({}, _.get(state, path))
	const metadata = getMetadata(state, path)

	switch (action.type) {
		case actions.FETCH_REQUESTED:
			newValue._metadata = _.merge(metadata, {
				isFetching: true,
				hasError: false,
				lastFetchError: undefined,
				timedOut: false
			})
			//check if the path has numbers
			if (path.some(e => !isNaN(e))) {
				return _fp.setWith(Object, path, newValue, state)
			}
			return _fp.set(path, newValue, state)

		case actions.FETCH_RESULT_RECEIVED:
			newValue = action.data
			newValue._metadata = _.merge(metadata, {
				isFetching: false,
				hasError: false,
				lastFetchError: undefined,
				timedOut: false,
				fetchedAt: new Date()
			})
			convertArrayToObject(newValue)
			if (path.some(e => !isNaN(e))) {
				return _fp.setWith(Object, path, newValue, state)
			}
			return _fp.set(path, newValue, state)

		case actions.FETCH_FAILED:
			newValue._metadata = _.merge(metadata, {
				isFetching: false,
				hasError: true,
				lastFetchError: action.errorData,
				timedOut: !!action.didTimeOut
			})
			if (path.some(e => !isNaN(e))) {
				return _fp.setWith(Object, path, newValue, state)
			}
			return _fp.set(path, newValue, state)

		case actions.KEY_REMOVAL_REQUESTED:
			return _fp.unset(path, state)

		default:
			return state
	}
}
