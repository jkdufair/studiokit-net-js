'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.setApiRoot = setApiRoot;
exports.doFetch = doFetch;

var _effects = require('redux-saga/effects');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [doFetch].map(_regenerator2.default.mark);

var apiRoot = void 0;

function setApiRoot(uri) {
	apiRoot = uri;
}

function doFetch(config) {
	var path, method, headers, body, response;
	return _regenerator2.default.wrap(function doFetch$(_context) {
		while (1) {
			switch (_context.prev = _context.next) {
				case 0:
					if (config.path) {
						_context.next = 2;
						break;
					}

					throw new Error('\'config.path\' is required for fetchService');

				case 2:
					path = config.path.startsWith('http') ? config.path : '' + apiRoot + config.path;

					method = config.method || 'GET';
					headers = config.headers;
					body = config.body;
					_context.prev = 7;
					_context.next = 10;
					return (0, _effects.call)(fetch, path, {
						method: method,
						headers: headers,
						body: JSON.stringify(body)
					});

				case 10:
					response = _context.sent;

					if (!response) {
						_context.next = 17;
						break;
					}

					_context.next = 14;
					return (0, _effects.call)(function () {
						return response.json();
					});

				case 14:
					_context.t0 = _context.sent;
					_context.next = 18;
					break;

				case 17:
					_context.t0 = {};

				case 18:
					return _context.abrupt('return', _context.t0);

				case 21:
					_context.prev = 21;
					_context.t1 = _context['catch'](7);
					throw _context.t1;

				case 24:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this, [[7, 21]]);
}