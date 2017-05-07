import actions from '../actions'
import { fromJS } from 'immutable'

var createNestedObject = function(base, modelName) {
	const names = modelName.split('.')
	for (var i = 0; i < names.length; i++) {
		base = base[names[i]] = base[names[i]] || {};
	}
};

export default function fetchReducer(state = {}, action) {
	if (!action.modelName) {
		return state
	}
	const newObject = {}
	createNestedObject(newObject, action.modelName)
	let leafNode = Object.byString(newObject, action.modelName)
	switch (action.type) {
		case actions.FETCH_REQUESTED:
			leafNode.isFetching = true
			leafNode.hasError = false
			return Object.assign({}, state, newObject)

		case actions.FETCH_RESULT_RECEIVED:
			leafNode.data = action.data
			leafNode.isFetching = false
			leafNode.hasError = false
			leafNode.fetchedAt = new Date()
			return Object.assign({}, state, newObject)

		case actions.FETCH_FAILED:
			leafNode.isFetching = false
			leafNode.hasError = true
			return Object.assign({}, state, newObject)

		case actions.KEY_REMOVAL_REQUESTED:
			return fromJS(state).deleteIn(action.modelName.split('.')).toJS()

		default:
			return state
	}
}