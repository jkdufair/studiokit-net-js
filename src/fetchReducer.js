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

/**
 * Given the state and a path into that state object, return the prop that
 * is named "_metadata"
 * 
 * @param {FetchState} state - The redux state object
 * @param {Array<string>} path - An array of keys that represent the path to the entity in question
 */
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
function convertArraysToObjects(data) {
	if (!_.isPlainObject(data) && !_.isArray(data)) return data
	if (_.isArray(data)) {
		if (data.length > 0 && !_.every(data, e => _.isPlainObject(e) && e.hasOwnProperty('id')))
			return data
		return Object.keys(data).reduce((prev, k) => {
			const value = data[k]
			const newKey = value.id
			prev[`${newKey}`] = convertArraysToObjects(value)
			return prev
		}, {})
	}
	return Object.keys(data).reduce((prev, k) => {
		prev[k] = convertArraysToObjects(data[k])
		return prev
	}, {})
}

/**
 * Get whether or not an object is a plain object where all keys are plain objects with 'id' properties.
 * @param {*} obj 
 * @returns A boolean
 */
function isCollection(obj) {
	return (
		_.isPlainObject(obj) &&
		Object.keys(obj).length > 0 &&
		_.every(obj, e => _.isPlainObject(e) && e.hasOwnProperty('id'))
	)
}

/**
 * Merge relations between the `current` and `incoming` recursively.
 * 
 * For each key in `current` whose value is an array or plain object:
 * a) remove if `current` is a "collection" and item key is not in `incoming`
 * b) recurse if `incoming` has a value
 * c) or preserve existing value
 * @param {*} current 
 * @param {*} incoming 
 */
function mergeRelations(current, incoming) {
	return Object.keys(current).reduce((prev, k) => {
		const c = current[k]
		const i = incoming[k]
		// skip all non-relations
		if (!_.isArray(c) && !_.isPlainObject(c)) {
			return prev
		}
		// remove "collection" item not included in incoming
		if (isCollection(current) && _.isUndefined(i)) {
			return prev
		}
		// merge relations, if incoming has value
		if (!_.isUndefined(i)) {
			prev[k] = mergeRelations(c, i)
		} else {
			// preserve existing relation
			prev[k] = c
		}
		return prev
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
			const incoming = action.data
			const incomingConverted = convertArraysToObjects(
				!_.isPlainObject(incoming) && !_.isArray(incoming) ? { response: incoming } : incoming
			)
			valueAtPath = _.merge({}, mergeRelations(valueAtPath, incomingConverted), incomingConverted)
			// Update the metadata to reflect fetch is complete.
			valueAtPath._metadata = _.merge(metadata, {
				isFetching: false,
				hasError: false,
				lastFetchError: undefined,
				timedOut: false,
				fetchedAt: new Date()
			})
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
