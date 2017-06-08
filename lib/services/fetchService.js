'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.setApiRoot = setApiRoot;
exports.getApiRoot = getApiRoot;
exports.doFetch = doFetch;

var _effects = require('redux-saga/effects');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [doFetch].map(_regenerator2.default.mark);

var apiRoot = void 0;

/**
 * Add query params to path. Prepend with apiRoot if necessary
 * 
 * @param {FetchConfig} config - The fetch configuration containing the path and query params
 * @returns A string with query params populated and prepended
 */
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

/**
 * A function to receieve and store the apiRoot for prepending to subsequent partial URLs in paths
 * 
 * @export
 * @param {string} uri - The uri to save and prepend later
 */
function setApiRoot(uri) {
	apiRoot = uri;
}

function getApiRoot() {
	return apiRoot;
}

/**
 * The function that actually sends the HTTP request and returns the response, handling errors.
 * Requests default to using GET method. Content-Type defaults to 'application/json'. Body is sent
 * as stringified JSON unless the 'application/x-www-form-urlencoded' Content-Type is detected, in which case
 * it's sent as provided
 * TODO: provide logging injection
 * 
 * @export
 * @param {FetchConfig} config - The configuration used to construct a fetch request
 * @returns {Object?} - The response, parsed as JSON
 */
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

					throw new Error("'config.path' is required for fetchService");

				case 2:
					method = config.method || 'GET';
					headers = Object.assign({}, {
						'Content-Type': 'application/json; charset=utf-8'
					}, config.headers);
					body = headers['Content-Type'].includes('application/x-www-form-urlencoded') ? config.body : JSON.stringify(config.body);
					_context.next = 7;
					return (0, _effects.call)(fetch, constructPath(config), {
						method: method,
						headers: headers,
						body: body
					});

				case 7:
					response = _context.sent;

					if (!response) {
						_context.next = 14;
						break;
					}

					_context.next = 11;
					return (0, _effects.call)(function () {
						return response.json();
					});

				case 11:
					_context.t0 = _context.sent;
					_context.next = 17;
					break;

				case 14:
					_context.next = 16;
					return (0, _effects.call)(function () {
						return null;
					});

				case 16:
					_context.t0 = _context.sent;

				case 17:
					return _context.abrupt('return', _context.t0);

				case 18:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this);
}