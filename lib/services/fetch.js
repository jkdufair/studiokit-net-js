'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.fetchService = fetchService;

var _effects = require('redux-saga/effects');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [fetchService].map(_regenerator2.default.mark);

function fetchService(config) {
	var path, method, headers, body, response, json;
	return _regenerator2.default.wrap(function fetchService$(_context) {
		while (1) {
			switch (_context.prev = _context.next) {
				case 0:
					path = config.path || '/';
					method = config.method || 'GET';
					headers = config.headers;
					body = config.body;
					_context.next = 6;
					return (0, _effects.call)(fetch, path, {
						method: method,
						headers: headers,
						body: JSON.stringify(body)
					});

				case 6:
					response = _context.sent;
					_context.next = 9;
					return (0, _effects.call)(response.json);

				case 9:
					json = _context.sent;
					return _context.abrupt('return', json);

				case 11:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this);
}