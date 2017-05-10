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

function constructPath(config) {
	var queryParams = void 0;
	if (config.queryParams) {
		queryParams = Object.keys(config.queryParams).map(function (key) {
			return encodeURIComponent(key) + '=' + encodeURIComponent(config.queryParams[key]);
		}).join('&');
	}

	var path = config.path.startsWith('http') ? config.path : '' + apiRoot + config.path;
	if (queryParams) {
		path = path + '?' + queryParams;
	}
	return path;
}

function doFetch(config) {
	var method, headers, body, response;
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
					method = config.method || 'GET';
					headers = Object.assign({}, {
						'Content-Type': 'application/json; charset=utf-8'
					}, config.headers);
					body = headers['Content-Type'].includes('application/x-www-form-urlencoded') ? config.body : JSON.stringify(config.body);
					_context.prev = 5;
					_context.next = 8;
					return (0, _effects.call)(fetch, constructPath(config), {
						method: method,
						headers: headers,
						body: body
					});

				case 8:
					response = _context.sent;

					if (!response) {
						_context.next = 15;
						break;
					}

					_context.next = 12;
					return (0, _effects.call)(function () {
						return response.json();
					});

				case 12:
					_context.t0 = _context.sent;
					_context.next = 16;
					break;

				case 15:
					_context.t0 = {};

				case 16:
					return _context.abrupt('return', _context.t0);

				case 19:
					_context.prev = 19;
					_context.t1 = _context['catch'](5);
					throw _context.t1;

				case 22:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this, [[5, 19]]);
}