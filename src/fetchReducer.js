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
 * Given a plain object, return an object whos own properties
 * are only the properties of obj whose values are arrays
 * or plain objects
 * i.e.: {'foo': 'bar', 'baz': {'quux': 7}, 'bleb': 4, 'boop':[1, 2, {'three': 4}]}
 * returns {baz': {'quux': 7}, 'boop':[1, 2, {'three': 4}]}
 *
 * @param obj A plain JS object
 * @returns A plain JS object with scalar-valued properties removed
**/
function nonScalars(obj) {
	return Object.keys(obj).reduce((prev, k) => {
		if (_.isArray(obj[k]) || _.isObject(obj[k])) return _.assign({}, prev, { [`${k}`]: obj[k] })
		else return prev
	}, {})
}

/**
 * Reducer for fetching. Fetching state updated with every action. Data updated on result received.
 * Data and fetchedDate NOT deleted on failed request. All data at key removed on KEY_REMOVAL_REQUESTED.
 * All actions require a modelName key to function with this reducer.
 * Arrays are converted to objects that represent a dictionary with the numeric id of the object used
 * as the key and the entire object used as the value
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
	// the object value at the specified path
	let valueAtPath = _.merge({}, _.get(state, path))
	const metadata = getMetadata(state, path)

	switch (action.type) {
		case actions.FETCH_REQUESTED:
			// Retain the entity data, update the metadata to reflect
			// fetch in request state.
			valueAtPath._metadata = _.merge(metadata, {
				isFetching: true,
				hasError: false,
				lastFetchError: undefined,
				timedOut: false
			})
			return _fp.setWith(Object, path, valueAtPath, state)

		case actions.FETCH_RESULT_RECEIVED:
			// Replace the object, preserving any children.
			// Update the metadata to reflect fetch is complete.
			// Children are preserved by copying references to the non-scalar
			// values (i.e. relations), and then setting the scalar values
			// from the response.
			const replacementValue =
				typeof action.data !== 'object' ? { response: action.data } : action.data
			valueAtPath = _.assign({}, nonScalars(valueAtPath), replacementValue)
			valueAtPath._metadata = _.merge(metadata, {
				isFetching: false,
				hasError: false,
				lastFetchError: undefined,
				timedOut: false,
				fetchedAt: new Date()
			})
			convertArraysToObject(valueAtPath)
			return _fp.setWith(Object, path, valueAtPath, state)

		case actions.FETCH_FAILED:
			// Retain the object, update the metadata to reflect the fact
			// that the request failed.
			valueAtPath._metadata = _.merge(metadata, {
				isFetching: false,
				hasError: true,
				lastFetchError: action.errorData,
				timedOut: !!action.didTimeOut
			})
			return _fp.setWith(Object, path, valueAtPath, state)

		case actions.KEY_REMOVAL_REQUESTED:
			// Completely remove the object at the path from
			// the state.
			return _fp.unset(path, state)

		default:
			return state
	}
}
