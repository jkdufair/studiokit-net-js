'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.__RewireAPI__ = exports.__ResetDependency__ = exports.__set__ = exports.__Rewire__ = exports.__GetDependency__ = exports.__get__ = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _utilities = require('./utilities');

var _utilities2 = _interopRequireDefault(_utilities);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('Utilities', function () {
	test('Should locate an object by key', function () {
		var obj = _get__('byString')({ foo: { bar: { baz: 'quux' } } }, 'foo.bar');
		expect(obj).toEqual({ baz: 'quux' });
	});

	test('Should return the entire object if the path is not found', function () {
		var srcObj = { foo: { bar: { baz: 'quux' } } };
		var f = function f() {
			return _get__('byString')(srcObj, 'none.of.these');
		};
		expect(f).toThrowError(/Key .+ not found in object/);
	});

	test('Should return the correct object even with a leading dot', function () {
		var obj = _get__('byString')({ foo: 'bar' }, '.foo');
		expect(obj).toEqual('bar');
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
		case 'byString':
			return _utilities2.default;
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