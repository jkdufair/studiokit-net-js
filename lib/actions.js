'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.createAction = createAction;


// App-level request
var DATA_REQUESTED = 'application/DATA_REQUESTED';
var PERIODIC_DATA_REQUESTED = 'application/PERIODIC_DATA_REQUESTED';
var PERIODIC_TERMINATION_REQUESTED = 'application/PERIODIC_TERMINATION_REQUESTED';
var DATA_REQUESTED_USE_LATEST = 'application/DATA_REQUESTED_USE_LATEST';

// System responses
var PERIODIC_TERMINATION_SUCCEEDED = 'sagas/PERIODIC_TERMINATION_SUCCEEDED';

// System requests for fetching/updating
var FETCH_REQUESTED = 'net/FETCH_REQUESTED';
var TRANSIENT_FETCH_REQUESTED = 'net/TRANSIENT_FETCH_REQUESTED';
var KEY_REMOVAL_REQUESTED = 'net/KEY_REMOVAL_REQUESTED';

// System responses to fetch requests
var FETCH_RESULT_RECEIVED = 'net/FETCH_RESULT_RECEIVED';
var TRANSIENT_FETCH_RESULT_RECEIVED = 'net/TRANSIENT_FETCH_RESULT_RECEIVED';
var FETCH_FAILED = 'net/FETCH_FAILED';
var FETCH_TIMED_OUT = 'net/FETCH_TIMED_OUT';
var TRANSIENT_FETCH_FAILED = 'net/TRANSIENT_FETCH_FAILED';
var FETCH_TRY_FAILED = 'net/FETCH_TRY_FAILED';

function createAction(type, payload) {
	return Object.assign({}, { type: type }, payload);
}

var _DefaultExportValue = {
	DATA_REQUESTED: _get__('DATA_REQUESTED'),
	PERIODIC_DATA_REQUESTED: _get__('PERIODIC_DATA_REQUESTED'),
	PERIODIC_TERMINATION_REQUESTED: _get__('PERIODIC_TERMINATION_REQUESTED'),
	DATA_REQUESTED_USE_LATEST: _get__('DATA_REQUESTED_USE_LATEST'),
	PERIODIC_TERMINATION_SUCCEEDED: _get__('PERIODIC_TERMINATION_SUCCEEDED'),
	FETCH_REQUESTED: _get__('FETCH_REQUESTED'),
	TRANSIENT_FETCH_REQUESTED: _get__('TRANSIENT_FETCH_REQUESTED'),
	KEY_REMOVAL_REQUESTED: _get__('KEY_REMOVAL_REQUESTED'),
	FETCH_FAILED: _get__('FETCH_FAILED'),
	FETCH_TIMED_OUT: _get__('FETCH_TIMED_OUT'),
	TRANSIENT_FETCH_FAILED: _get__('TRANSIENT_FETCH_FAILED'),
	FETCH_TRY_FAILED: _get__('FETCH_TRY_FAILED'),
	FETCH_RESULT_RECEIVED: _get__('FETCH_RESULT_RECEIVED'),
	TRANSIENT_FETCH_RESULT_RECEIVED: _get__('TRANSIENT_FETCH_RESULT_RECEIVED')
};
exports.default = _DefaultExportValue;

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
		case 'DATA_REQUESTED':
			return DATA_REQUESTED;

		case 'PERIODIC_DATA_REQUESTED':
			return PERIODIC_DATA_REQUESTED;

		case 'PERIODIC_TERMINATION_REQUESTED':
			return PERIODIC_TERMINATION_REQUESTED;

		case 'DATA_REQUESTED_USE_LATEST':
			return DATA_REQUESTED_USE_LATEST;

		case 'PERIODIC_TERMINATION_SUCCEEDED':
			return PERIODIC_TERMINATION_SUCCEEDED;

		case 'FETCH_REQUESTED':
			return FETCH_REQUESTED;

		case 'TRANSIENT_FETCH_REQUESTED':
			return TRANSIENT_FETCH_REQUESTED;

		case 'KEY_REMOVAL_REQUESTED':
			return KEY_REMOVAL_REQUESTED;

		case 'FETCH_FAILED':
			return FETCH_FAILED;

		case 'FETCH_TIMED_OUT':
			return FETCH_TIMED_OUT;

		case 'TRANSIENT_FETCH_FAILED':
			return TRANSIENT_FETCH_FAILED;

		case 'FETCH_TRY_FAILED':
			return FETCH_TRY_FAILED;

		case 'FETCH_RESULT_RECEIVED':
			return FETCH_RESULT_RECEIVED;

		case 'TRANSIENT_FETCH_RESULT_RECEIVED':
			return TRANSIENT_FETCH_RESULT_RECEIVED;
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

var _typeOfOriginalExport = typeof _DefaultExportValue === 'undefined' ? 'undefined' : _typeof(_DefaultExportValue);

function addNonEnumerableProperty(name, value) {
	Object.defineProperty(_DefaultExportValue, name, {
		value: value,
		enumerable: false,
		configurable: true
	});
}

if ((_typeOfOriginalExport === 'object' || _typeOfOriginalExport === 'function') && Object.isExtensible(_DefaultExportValue)) {
	addNonEnumerableProperty('__get__', _get__);
	addNonEnumerableProperty('__GetDependency__', _get__);
	addNonEnumerableProperty('__Rewire__', _set__);
	addNonEnumerableProperty('__set__', _set__);
	addNonEnumerableProperty('__reset__', _reset__);
	addNonEnumerableProperty('__ResetDependency__', _reset__);
	addNonEnumerableProperty('__with__', _with__);
	addNonEnumerableProperty('__RewireAPI__', _RewireAPI__);
}

exports.__get__ = _get__;
exports.__GetDependency__ = _get__;
exports.__Rewire__ = _set__;
exports.__set__ = _set__;
exports.__ResetDependency__ = _reset__;
exports.__RewireAPI__ = _RewireAPI__;