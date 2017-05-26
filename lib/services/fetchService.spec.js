'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.__RewireAPI__ = exports.__ResetDependency__ = exports.__set__ = exports.__Rewire__ = exports.__GetDependency__ = exports.__get__ = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _fetchService = require('./fetchService');

describe('Path construction', function () {
	var constructPath = _get__('FetchServiceRewireAPI').__get__('constructPath');
	test('Should not add a question mark to a path without query params', function () {
		var path = constructPath({ path: 'http://abc.xyz/api/foo' });
		expect(path).toEqual('http://abc.xyz/api/foo');
	});

	test('Should add a single query param', function () {
		var path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz'
			}
		});
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz');
	});

	test('Should add mulitple query params', function () {
		var path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				quux: 'wawa'
			}
		});
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz&quux=wawa');
	});

	test('Should encode params', function () {
		var path = constructPath({
			path: 'http://abc.xyz/api/foo',
			queryParams: {
				bar: 'baz',
				$foo: '/bar'
			}
		});
		expect(path).toEqual('http://abc.xyz/api/foo?bar=baz&%24foo=%2Fbar');
	});

	test('Should prepend baseUrl via config', function () {
		var existingApiRoot = _get__('getApiRoot')();
		_get__('setApiRoot')('http://abc.xyz');
		var path = constructPath({ path: '/api/foo' });
		expect(path).toEqual('http://abc.xyz/api/foo');
		_get__('setApiRoot')(existingApiRoot);
	});
});

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
		case 'FetchServiceRewireAPI':
			return _fetchService.__RewireAPI__;

		case 'getApiRoot':
			return _fetchService.getApiRoot;

		case 'setApiRoot':
			return _fetchService.setApiRoot;
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
	switch (variableName) {}

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