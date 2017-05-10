'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.sagas = exports.reducers = exports.actions = undefined;

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _reducers = require('./reducers');

var _reducers2 = _interopRequireDefault(_reducers);

var _sagas = require('./sagas');

var _sagas2 = _interopRequireDefault(_sagas);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

Object.byString = function (o, s) {
	s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
	s = s.replace(/^\./, ''); // strip a leading dot
	var a = s.split('.');
	for (var i = 0, n = a.length; i < n; ++i) {
		var k = a[i];
		if (k in o) {
			o = o[k];
		} else {
			return;
		}
	}
	return o;
};

exports.actions = _actions2.default;
exports.reducers = _reducers2.default;
exports.sagas = _sagas2.default;