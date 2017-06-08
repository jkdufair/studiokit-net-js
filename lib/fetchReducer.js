'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = fetchReducer;

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
function fetchReducer() {
	var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	var action = arguments[1];

	if (!action.modelName) {
		return state;
	}
	var modelName = action.modelName;
	var newState = _lodash2.default.set({}, modelName, {});
	// leafNode is a reference to the model at the (potentially) nested path referenced by modelName
	var leafNode = _lodash2.default.get(newState, modelName);

	switch (action.type) {
		case _actions2.default.FETCH_REQUESTED:
			leafNode.isFetching = true;
			leafNode.hasError = false;
			leafNode.timedOut = false;
			return _lodash2.default.merge({}, state, newState);

		case _actions2.default.FETCH_RESULT_RECEIVED:
			leafNode.data = action.data;
			leafNode.isFetching = false;
			leafNode.hasError = false;
			leafNode.timedOut = false;
			leafNode.fetchedAt = new Date();
			var path = modelName.split('.');
			path.push('data');
			// Do not delete and re-add the data. Just replace it when this action is received
			return _lodash2.default.merge({}, _lodash2.default.omit(state, path), newState);

		case _actions2.default.FETCH_FAILED:
			leafNode.isFetching = false;
			leafNode.hasError = true;
			leafNode.timedOut = false;
			return _lodash2.default.merge({}, state, newState);

		case _actions2.default.FETCH_TIMED_OUT:
			leafNode.isFetching = false;
			leafNode.hasError = true;
			leafNode.timedOut = true;
			return _lodash2.default.merge({}, state, newState);

		case _actions2.default.KEY_REMOVAL_REQUESTED:
			return _lodash2.default.omit(state, modelName);

		default:
			return state;
	}
}