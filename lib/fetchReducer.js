'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = fetchReducer;

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _immutable = require('immutable');

var _utilities = require('./utilities');

var _utilities2 = _interopRequireDefault(_utilities);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Given an object, add keys matching the path in modelName.
 * Matching keys will be overwritten
 * 
 * 'foo.bar.baz' generates
 * {
 * 	foo: {
 * 		bar: {
 * 			baz: {
 * 			}
 * 		}
 * 	}
 * }
 * 
 * This function mutates the object. Immutablility coming!
 * 
 * @param {Object} base - An existing object
 * @param {string} modelName - The period-separated path to the model, i.e. 'foo.bar.baz'
 */
var createNestedObject = function createNestedObject(base, modelName) {
	var names = modelName.split('.');
	for (var i = 0; i < names.length; i++) {
		base = base[names[i]] = base[names[i]] || {};
	}
};

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

	var newState = {};
	createNestedObject(newState, modelName);
	// leafNode is a reference to the model at the (potentially) nested path referenced by modelName
	var leafNode = (0, _utilities2.default)(newState, modelName);

	switch (action.type) {
		case _actions2.default.FETCH_REQUESTED:
			leafNode.isFetching = true;
			leafNode.hasError = false;
			leafNode.timedOut = false;
			return (0, _immutable.fromJS)(state).mergeDeep(newState).toJS();

		case _actions2.default.FETCH_RESULT_RECEIVED:
			leafNode.data = action.data;
			leafNode.isFetching = false;
			leafNode.hasError = false;
			leafNode.timedOut = false;
			leafNode.fetchedAt = new Date();
			// Do not delete and re-add the data. Just replace it when this action is received
			var path = modelName.split('.');
			path.push('data');
			return (0, _immutable.fromJS)(state).deleteIn(path).mergeDeep(newState).toJS();

		case _actions2.default.FETCH_FAILED:
			leafNode.isFetching = false;
			leafNode.hasError = true;
			leafNode.timedOut = false;
			return (0, _immutable.fromJS)(state).mergeDeep(newState).toJS();

		case _actions2.default.FETCH_TIMED_OUT:
			leafNode.isFetching = false;
			leafNode.hasError = true;
			leafNode.timedOut = true;
			return (0, _immutable.fromJS)(state).mergeDeep(newState).toJS();

		case _actions2.default.KEY_REMOVAL_REQUESTED:
			return (0, _immutable.fromJS)(state).deleteIn(modelName.split('.')).toJS();

		default:
			return state;
	}
}