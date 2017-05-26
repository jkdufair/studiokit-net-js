'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.__RewireAPI__ = exports.__ResetDependency__ = exports.__set__ = exports.__Rewire__ = exports.__GetDependency__ = exports.__get__ = undefined;

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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

	var path = config.path.startsWith('http') ? config.path : '' + _get__('apiRoot') + config.path;
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
	_assign__('apiRoot', uri);
}

function getApiRoot() {
	return _get__('apiRoot');
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
					_context.prev = 5;
					_context.next = 8;
					return _get__('call')(fetch, _get__('constructPath')(config), {
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
					return _get__('call')(function () {
						return response.json();
					});

				case 12:
					_context.t0 = _context.sent;
					_context.next = 18;
					break;

				case 15:
					_context.next = 17;
					return _get__('call')(function () {
						return null;
					});

				case 17:
					_context.t0 = _context.sent;

				case 18:
					return _context.abrupt('return', _context.t0);

				case 21:
					_context.prev = 21;
					_context.t1 = _context['catch'](5);
					throw _context.t1;

				case 24:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this, [[5, 21]]);
}

function _getGlobalObject() {
	try {
		if (!!global) {
			return global;
		}
	} catch (e) {
		try {
			if (!!window) {
				return window;
			}
		} catch (e) {
			return this;
		}
	}
}

;
var _RewireModuleId__ = null;

function _getRewireModuleId__() {
	if (_RewireModuleId__ === null) {
		var globalVariable = _getGlobalObject();

		if (!globalVariable.__$$GLOBAL_REWIRE_NEXT_MODULE_ID__) {
			globalVariable.__$$GLOBAL_REWIRE_NEXT_MODULE_ID__ = 0;
		}

		_RewireModuleId__ = __$$GLOBAL_REWIRE_NEXT_MODULE_ID__++;
	}

	return _RewireModuleId__;
}

function _getRewireRegistry__() {
	var theGlobalVariable = _getGlobalObject();

	if (!theGlobalVariable.__$$GLOBAL_REWIRE_REGISTRY__) {
		theGlobalVariable.__$$GLOBAL_REWIRE_REGISTRY__ = Object.create(null);
	}

	return __$$GLOBAL_REWIRE_REGISTRY__;
}

function _getRewiredData__() {
	var moduleId = _getRewireModuleId__();

	var registry = _getRewireRegistry__();

	var rewireData = registry[moduleId];

	if (!rewireData) {
		registry[moduleId] = Object.create(null);
		rewireData = registry[moduleId];
	}

	return rewireData;
}

(function registerResetAll() {
	var theGlobalVariable = _getGlobalObject();

	if (!theGlobalVariable['__rewire_reset_all__']) {
		theGlobalVariable['__rewire_reset_all__'] = function () {
			theGlobalVariable.__$$GLOBAL_REWIRE_REGISTRY__ = Object.create(null);
		};
	}
})();

var INTENTIONAL_UNDEFINED = '__INTENTIONAL_UNDEFINED__';
var _RewireAPI__ = {};

(function () {
	function addPropertyToAPIObject(name, value) {
		Object.defineProperty(_RewireAPI__, name, {
			value: value,
			enumerable: false,
			configurable: true
		});
	}

	addPropertyToAPIObject('__get__', _get__);
	addPropertyToAPIObject('__GetDependency__', _get__);
	addPropertyToAPIObject('__Rewire__', _set__);
	addPropertyToAPIObject('__set__', _set__);
	addPropertyToAPIObject('__reset__', _reset__);
	addPropertyToAPIObject('__ResetDependency__', _reset__);
	addPropertyToAPIObject('__with__', _with__);
})();

function _get__(variableName) {
	var rewireData = _getRewiredData__();

	if (rewireData[variableName] === undefined) {
		return _get_original__(variableName);
	} else {
		var value = rewireData[variableName];

		if (value === INTENTIONAL_UNDEFINED) {
			return undefined;
		} else {
			return value;
		}
	}
}

function _get_original__(variableName) {
	switch (variableName) {
		case 'apiRoot':
			return apiRoot;

		case 'call':
			return _effects.call;

		case 'constructPath':
			return constructPath;
	}

	return undefined;
}

function _assign__(variableName, value) {
	var rewireData = _getRewiredData__();

	if (rewireData[variableName] === undefined) {
		return _set_original__(variableName, value);
	} else {
		return rewireData[variableName] = value;
	}
}

function _set_original__(variableName, _value) {
	switch (variableName) {
		case 'apiRoot':
			return apiRoot = _value;
	}

	return undefined;
}

function _update_operation__(operation, variableName, prefix) {
	var oldValue = _get__(variableName);

	var newValue = operation === '++' ? oldValue + 1 : oldValue - 1;

	_assign__(variableName, newValue);

	return prefix ? newValue : oldValue;
}

function _set__(variableName, value) {
	var rewireData = _getRewiredData__();

	if ((typeof variableName === 'undefined' ? 'undefined' : _typeof(variableName)) === 'object') {
		Object.keys(variableName).forEach(function (name) {
			rewireData[name] = variableName[name];
		});
	} else {
		if (value === undefined) {
			rewireData[variableName] = INTENTIONAL_UNDEFINED;
		} else {
			rewireData[variableName] = value;
		}

		return function () {
			_reset__(variableName);
		};
	}
}

function _reset__(variableName) {
	var rewireData = _getRewiredData__();

	delete rewireData[variableName];

	if (Object.keys(rewireData).length == 0) {
		delete _getRewireRegistry__()[_getRewireModuleId__];
	}

	;
}

function _with__(object) {
	var rewireData = _getRewiredData__();

	var rewiredVariableNames = Object.keys(object);
	var previousValues = {};

	function reset() {
		rewiredVariableNames.forEach(function (variableName) {
			rewireData[variableName] = previousValues[variableName];
		});
	}

	return function (callback) {
		rewiredVariableNames.forEach(function (variableName) {
			previousValues[variableName] = rewireData[variableName];
			rewireData[variableName] = object[variableName];
		});
		var result = callback();

		if (!!result && typeof result.then == 'function') {
			result.then(reset).catch(reset);
		} else {
			reset();
		}

		return result;
	};
}

exports.__get__ = _get__;
exports.__GetDependency__ = _get__;
exports.__Rewire__ = _set__;
exports.__set__ = _set__;
exports.__ResetDependency__ = _reset__;
exports.__RewireAPI__ = _RewireAPI__;
exports.default = _RewireAPI__;