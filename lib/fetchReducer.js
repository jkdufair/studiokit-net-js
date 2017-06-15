'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = fetchReducer;

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _fp = require('lodash/fp');

var _fp2 = _interopRequireDefault(_fp);

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
	var path = action.modelName.split('.');
	var newValue = {};
	newValue.data = _fp2.default.get(_fp2.default.union(['data'], path), state);

	switch (action.type) {
		case _actions2.default.FETCH_REQUESTED:
			newValue.isFetching = true;
			newValue.hasError = false;
			newValue.timedOut = false;
			return _fp2.default.set(path, newValue, state);

		case _actions2.default.FETCH_RESULT_RECEIVED:
			newValue.data = action.data;
			newValue.isFetching = false;
			newValue.hasError = false;
			newValue.timedOut = false;
			newValue.fetchedAt = new Date();
			return _fp2.default.set(path, newValue, state);

		case _actions2.default.FETCH_FAILED:
			newValue.isFetching = false;
			newValue.hasError = true;
			newValue.timedOut = false;
			return _fp2.default.set(path, newValue, state);

		case _actions2.default.FETCH_TIMED_OUT:
			newValue.isFetching = false;
			newValue.hasError = true;
			newValue.timedOut = true;
			return _fp2.default.set(path, newValue, state);

		case _actions2.default.KEY_REMOVAL_REQUESTED:
			return _fp2.default.omit(path, state);

		default:
			return state;
	}
}