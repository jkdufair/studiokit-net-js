'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.default = fetchReducer;

var _actions = require('../actions');

var _actions2 = _interopRequireDefault(_actions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function fetchReducer() {
	var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
	var action = arguments[1];

	switch (action.type) {
		case _actions2.default.FETCH_REQUEST:
			return Object.assign({}, state, _defineProperty({}, '' + action.modelName, {
				isFetching: true,
				hasError: false
			}));
		case _actions2.default.STORE_FETCH_RESULT:
			return Object.assign({}, state, _defineProperty({}, '' + action.modelName, {
				data: action.data,
				isFetching: false,
				hasError: false,
				fetchedAt: new Date()
			}));
		case _actions2.default.FETCH_FAIL:
			return Object.assign({}, state, _defineProperty({}, '' + action.modelName, {
				isFetching: false,
				hasError: true
			}));

		default:
			return state;
	}
}