'use strict'

Object.defineProperty(exports, '__esModule', {
	value: true
})

var _regenerator = require('babel-runtime/regenerator')

var _regenerator2 = _interopRequireDefault(_regenerator)

exports.setApiRoot = setApiRoot
exports.getApiRoot = getApiRoot
exports.doFetch = doFetch

var _effects = require('redux-saga/effects')

var _lodash = require('lodash')

var _lodash2 = _interopRequireDefault(_lodash)

function _interopRequireDefault(obj) {
	return obj && obj.__esModule ? obj : { default: obj }
}

var _marked = [doFetch].map(_regenerator2.default.mark)

var queryString = require('query-string')

var apiRoot = void 0

/**
 * Add query params to path. Prepend with apiRoot if necessary
 * 
 * @param {FetchConfig} config - The fetch configuration containing the path and query params
 * @returns A string with query params populated and prepended
 */
function constructPath(config) {
	var queryParams = void 0
	if (config.queryParams) {
		queryParams = queryString.stringify(config.queryParams)
		/*queryParams = Object.keys(config.queryParams)
  	.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(config.queryParams[key])}`)
  	.join('&')*/
	}

	var path = _lodash2.default.startsWith(config.path, 'http')
		? config.path
		: '' + apiRoot + config.path
	if (queryParams) {
		path = path + '?' + queryParams
	}
	return path
}

/**
 * A function to receieve and store the apiRoot for prepending to subsequent partial URLs in paths
 * 
 * @export
 * @param {string} uri - The uri to save and prepend later
 */
function setApiRoot(uri) {
	apiRoot = uri
}

function getApiRoot() {
	return apiRoot
}

/**
 * The function that actually sends the HTTP request and returns the response, handling errors.
 * Requests default to using GET method. Content-Type defaults to 'application/json'. Body is sent
 * as stringified JSON unless the 'application/x-www-form-urlencoded' Content-Type is detected, in which case
 * it's sent as provided. If it is a 'multipart/form-data', we are assuming that the data is being sent as a FormData, and
 * we do not set the Content-type (https://stackoverflow.com/questions/39280438/fetch-missing-boundary-in-multipart-form-data-post).
 * TODO: provide logging injection
 * 
 * @export
 * @param {FetchConfig} config - The configuration used to construct a fetch request
 * @returns {Object?} - The response, parsed as JSON
 */
function doFetch(config) {
	var method, headers, isBodyJson, body, response, result, isResponseJson
	return _regenerator2.default.wrap(
		function doFetch$(_context) {
			while (1) {
				switch ((_context.prev = _context.next)) {
					case 0:
						if (config.path) {
							_context.next = 2
							break
						}

						throw new Error("'config.path' is required for fetchService")

					case 2:
						method = config.method || 'GET'
						headers =
							// setting FormData as the body will set "Content-Type", including "boundary"
							// do not interfere
							config.contentType === 'multipart/form-data'
								? _lodash2.default.merge({}, config.headers)
								: _lodash2.default.merge(
										{},
										{
											'Content-Type': !!config.contentType
												? config.contentType
												: 'application/json; charset=utf-8'
										},
										config.headers
									)
						isBodyJson =
							headers['Content-Type'] &&
							_lodash2.default.includes(headers['Content-Type'], 'application/json')
						body = !isBodyJson ? config.body : JSON.stringify(config.body)
						_context.next = 8
						return (0, _effects.call)(fetch, constructPath(config), {
							method: method,
							headers: headers,
							body: body
						})

					case 8:
						response = _context.sent

						if (response) {
							_context.next = 11
							break
						}

						return _context.abrupt('return', undefined)

					case 11:
						// construct a subset of the response object to return
						result = {
							ok: response.ok,
							status: response.status,
							data: undefined

							// If the request was a 204, use the body (if any) that was PUT in the request as the "response"
							// so it gets incorporated correctly into Redux
							// 200/201 should return a representation of the entity.
							// (https://tools.ietf.org/html/rfc7231#section-6.3.1)
						}
						isResponseJson =
							!!response.headers &&
							response.headers.has('Content-Type') &&
							_lodash2.default.includes(response.headers.get('Content-Type'), 'application/json')

						if (!(response.status === 204)) {
							_context.next = 17
							break
						}

						result.data = isBodyJson ? config.body : undefined
						_context.next = 27
						break

					case 17:
						if (!isResponseJson) {
							_context.next = 23
							break
						}

						_context.next = 20
						return (0, _effects.call)(function() {
							return response.json()
						})

					case 20:
						_context.t0 = _context.sent
						_context.next = 26
						break

					case 23:
						_context.next = 25
						return (0, _effects.call)(function() {
							return response.text()
						})

					case 25:
						_context.t0 = _context.sent

					case 26:
						result.data = _context.t0

					case 27:
						if (!response.ok) {
							// note: error responses are expected to be JSON
							result.data = _lodash2.default.merge(
								{},
								{
									title: 'Error',
									message: response.statusText,
									code: response.status
								},
								result.data
							)
						}

						return _context.abrupt('return', result)

					case 29:
					case 'end':
						return _context.stop()
				}
			}
		},
		_marked[0],
		this
	)
}
