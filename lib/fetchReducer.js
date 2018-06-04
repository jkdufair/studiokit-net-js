'use strict'

Object.defineProperty(exports, '__esModule', {
	value: true
})
exports.default = fetchReducer

var _actions = require('./actions')

var _actions2 = _interopRequireDefault(_actions)

var _lodash = require('lodash')

var _lodash2 = _interopRequireDefault(_lodash)

var _fp2 = require('lodash/fp')

var _fp3 = _interopRequireDefault(_fp2)

function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}

/**
 * Given the state and a path into that state object, return the prop that
 * is named "_metadata"
 * 
 * @param {FetchState} state - The redux state object
 * @param {Array<string>} path - An array of keys that represent the path to the entity in question
 */
function getMetadata(state, path) {
	return _lodash2.default.merge({}, _lodash2.default.get(state, path.concat('_metadata')))
}

/**
 * Get whether or not an object is a "collection" (id key-value dictionary).
 * @param {*} obj 
 * @returns A boolean
 */

function isCollection(obj) {
	return (
		_lodash2.default.isPlainObject(obj) &&
		Object.keys(obj).length > 0 &&
		Object.keys(obj).every(function(key) {
			var child = obj[key]
			return (
				_lodash2.default.isPlainObject(child) &&
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
 * @param {*} current 
 * @param {*} incoming 
 */
function mergeRelations(current, incoming) {
	return Object.keys(current).reduce(function(prev, k) {
		var c = current[k]
		var i = incoming[k]
		// skip all non-relations
		if (!_lodash2.default.isArray(c) && !_lodash2.default.isPlainObject(c)) {
			return prev
		}
		// remove "collection" item not included in incoming
		if ((isCollection(current) || isCollection(incoming)) && _lodash2.default.isUndefined(i)) {
			return prev
		}
		// merge relations, if incoming has value
		if (!_lodash2.default.isUndefined(i)) {
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
function fetchReducer() {
	var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {}
	var action = arguments[1]

	if (!action.modelName) {
		return state
	}
	var path = action.modelName.split('.')
	if (action.reduxPath) {
		path.concat(action.reduxPath)
	}
	path.concat('data')

	// the object value at the specified path
	var valueAtPath = _lodash2.default.merge({}, _lodash2.default.get(state, path))
	var metadata = getMetadata(state, path)

	switch (action.type) {
		case _actions2.default.FETCH_REQUESTED:
			// Retain the entity data, update the metadata to reflect
			// fetch in request state.
			valueAtPath._metadata = _lodash2.default.merge(metadata, {
				isFetching: true,
				hasError: false,
				lastFetchError: undefined,
				timedOut: false
			})
			return _fp3.default.setWith(Object, path, valueAtPath, state)

		case _actions2.default.FETCH_RESULT_RECEIVED:
			var incoming =
				!_lodash2.default.isPlainObject(action.data) && !_lodash2.default.isArray(action.data)
					? { response: action.data }
					: action.data
			valueAtPath.data = incoming
			// Update the metadata to reflect fetch is complete.
			valueAtPath._metadata = _lodash2.default.merge(metadata, {
				isFetching: false,
				hasError: false,
				lastFetchError: undefined,
				timedOut: false,
				fetchedAt: new Date()
			})
			return _fp3.default.setWith(Object, path, valueAtPath, state)

		case _actions2.default.FETCH_FAILED:
			// Retain the object, update the metadata to reflect the fact
			// that the request failed.
			valueAtPath._metadata = _lodash2.default.merge(metadata, {
				isFetching: false,
				hasError: true,
				lastFetchError: action.errorData,
				timedOut: !!action.didTimeOut
			})
			return _fp3.default.setWith(Object, path, valueAtPath, state)

		case _actions2.default.KEY_REMOVAL_REQUESTED:
			// Completely remove the object at the path from
			// the state.
			return _fp3.default.unset(path, state)

		default:
			return state
	}
}
