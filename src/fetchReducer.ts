import _, { Dictionary } from 'lodash'
import _fp from 'lodash/fp'
import { NET_ACTION } from './actions'
import { FetchAction, Metadata, Model } from './types'

/**
 * Given the state and a path into that state object, return the prop that
 * is named "_metadata"
 *
 * @param state The redux state object
 * @param path An array of keys that represent the path to the entity in question
 */
export function getMetadata(state: object, path: string[]): Metadata {
	return _.merge({}, _.get(state, path.concat('_metadata')))
}

/**
 * Get whether or not an object is a "collection" (id key-value dictionary).
 * @param obj
 * @returns A boolean
 */
export function isCollection(obj: any) {
	return (
		_.isPlainObject(obj) &&
		Object.keys(obj).length > 0 &&
		Object.keys(obj).every(key => {
			const child = obj[key]
			return (
				_.isPlainObject(child) &&
				(key === '_metadata' ||
					(child.hasOwnProperty('id') && (child.id === parseInt(key, 10) || child.id === key)))
			)
		})
	)
}

/**
 * Merge relations between the `current` and `incoming` recursively.
 *
 * For each key in `current` whose value is an array or plain object:
 * a) remove if `current` is a "collection" and item key is not in `incoming`
 * b) recurse if `incoming` has a value
 * c) or preserve existing value
 * @param current
 * @param incoming
 */
export function mergeRelations(current: Dictionary<any>, incoming?: Dictionary<any>) {
	return Object.keys(current).reduce((prev: Dictionary<any>, k) => {
		const c = current[k]
		const i = incoming && incoming[k]
		// skip all non-relations
		if (!_.isArray(c) && !_.isPlainObject(c)) {
			return prev
		}
		// remove "collection" item not included in incoming
		if ((isCollection(current) || isCollection(incoming)) && _.isUndefined(i)) {
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
 * @param state The state of the models. Initially empty
 * @param action The action upon which we dispatch
 * @returns The updated state
 */
export default function fetchReducer(state: object = {}, action: FetchAction) {
	if (!action.modelName) {
		return state
	}
	const path: string[] = action.modelName.split('.')
	// the object value at the specified path
	let valueAtPath: Model = _.merge({}, _.get(state, path))
	const metadata = getMetadata(state, path)

	switch (action.type) {
		case NET_ACTION.FETCH_REQUESTED:
			// Retain the entity data, update the metadata to reflect
			// fetch in request state.
			valueAtPath._metadata = _.merge(metadata, {
				isFetching: true,
				hasError: false,
				lastFetchError: undefined
			})
			return _fp.setWith(Object, path, valueAtPath, state)

		case NET_ACTION.FETCH_RESULT_RECEIVED:
			const incoming =
				!_.isPlainObject(action.data) && !_.isArray(action.data) ? { response: action.data } : action.data
			valueAtPath = _.merge({}, mergeRelations(valueAtPath, incoming), incoming)
			// Update the metadata to reflect fetch is complete.
			valueAtPath._metadata = _.merge(metadata, {
				isFetching: false,
				hasError: false,
				lastFetchError: undefined,
				fetchedAt: new Date()
			})
			return _fp.setWith(Object, path, valueAtPath, state)

		case NET_ACTION.FETCH_FAILED:
			// Retain the object, update the metadata to reflect the fact
			// that the request failed.
			valueAtPath._metadata = _.merge(metadata, {
				isFetching: false,
				hasError: true,
				lastFetchError: action.errorData
			})
			return _fp.setWith(Object, path, valueAtPath, state)

		case NET_ACTION.KEY_REMOVAL_REQUESTED:
			// Completely remove the object at the path from
			// the state.
			return _fp.unset(path, state)

		default:
			return state
	}
}
