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

/**
 * Converts any arrays in a object into objects itself recursively.
 * If all the elements in an array are plain objects, then set their keys by:
 * 1. the property ID, if any
 * 2. else from 0 to length of the array
 * If not all elements in the array are plain objects, then leave it as an array
 * 
 * @param data - the data object
 * @returns data and its array elements converted into objects if needed
 */
function convertArraysToObject(data) {
	_.forEach(data, function(value, key) {
		if (_.isObject(value)) {
			convertArraysToObject(value)
		}
		if (_.isArray(value)) {
			if (value.every(e => _.isPlainObject(e))) {
				let indexKey = 0
				const newValue = value.every(e => e.hasOwnProperty('id'))
					? _.keyBy(value, 'id')
					: _.keyBy(value, function() {
							return indexKey++
						})

				data[key] = newValue
			}
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
			convertArraysToObject(newValue)
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
