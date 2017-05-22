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

var createNestedObject = function createNestedObject(base, modelName) {
	var names = modelName.split('.');
	for (var i = 0; i < names.length; i++) {
		base = base[names[i]] = base[names[i]] || {};
	}
};

function fetchReducer() {
	var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	var action = arguments[1];

	if (!action.modelName) {
		return state;
	}
	var modelName = action.modelName;

	var newObject = {};
	createNestedObject(newObject, modelName);
	var leafNode = (0, _utilities2.default)(newObject, modelName);

	switch (action.type) {
		case _actions2.default.FETCH_REQUESTED:
			leafNode.isFetching = true;
			leafNode.hasError = false;
			leafNode.timedOut = false;
			return (0, _immutable.fromJS)(state).deleteIn('fetchedAt').mergeDeep(newObject).toJS();

		case _actions2.default.FETCH_RESULT_RECEIVED:
			leafNode.data = action.data;
			leafNode.isFetching = false;
			leafNode.hasError = false;
			leafNode.timedOut = false;
			leafNode.fetchedAt = new Date();
			return (0, _immutable.fromJS)(state).mergeDeep(newObject).toJS();

		case _actions2.default.FETCH_FAILED:
			leafNode.isFetching = false;
			leafNode.hasError = true;
			leafNode.timedOut = false;
			return (0, _immutable.fromJS)(state).mergeDeep(newObject).toJS();

		case _actions2.default.FETCH_TIMED_OUT:
			leafNode.isFetching = false;
			leafNode.hasError = true;
			leafNode.timedOut = true;
			return (0, _immutable.fromJS)(state).mergeDeep(newObject).toJS();

		case _actions2.default.KEY_REMOVAL_REQUESTED:
			return (0, _immutable.fromJS)(state).deleteIn(modelName.split('.')).toJS();

		default:
			return state;
	}
}