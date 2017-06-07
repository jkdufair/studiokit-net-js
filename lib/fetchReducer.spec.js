'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.__RewireAPI__ = exports.__ResetDependency__ = exports.__set__ = exports.__Rewire__ = exports.__GetDependency__ = exports.__get__ = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _fetchReducer = require('./fetchReducer');

var _fetchReducer2 = _interopRequireDefault(_fetchReducer);

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('fetchReducer', function () {
	test('Do nothing without action.modelName', function () {
		var state = _get__('fetchReducer')({ foo: 'bar' }, {});
		expect(state).toEqual({ foo: 'bar' });
	});

	describe('FETCH_REQUESTED', function () {
		test('single level', function () {
			var state = _get__('fetchReducer')({}, { type: _get__('actions').FETCH_REQUESTED, modelName: 'test' });
			expect(state).toEqual({
				test: { isFetching: true, hasError: false, timedOut: false }
			});
		});

		test('nested level', function () {
			var state = _get__('fetchReducer')({}, { type: _get__('actions').FETCH_REQUESTED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			});
		});

		test('nested level merge state', function () {
			var state = _get__('fetchReducer')({ foo: 'bar' }, { type: _get__('actions').FETCH_REQUESTED, modelName: 'user.test' });
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			});
		});

		test('nested level replace state', function () {
			var state = _get__('fetchReducer')({ user: 'bar' }, { type: _get__('actions').FETCH_REQUESTED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			});
		});
	});

	describe('FETCH_RESULT_RECEIVED', function () {
		test('single level', function () {
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			var state = _get__('fetchReducer')({}, {
				type: _get__('actions').FETCH_RESULT_RECEIVED,
				modelName: 'test',
				data: { key: 'value' }
			});
			expect(state).toEqual({
				test: {
					isFetching: false,
					hasError: false,
					timedOut: false,
					fetchedAt: fetchedAtDate,
					data: { key: 'value' }
				}
			});
			global.Date = _Date;
		});

		test('nested level', function () {
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			var state = _get__('fetchReducer')({}, {
				type: _get__('actions').FETCH_RESULT_RECEIVED,
				modelName: 'user.test',
				data: { key: 'value' }
			});
			expect(state).toEqual({
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value' }
					}
				}
			});
		});

		test('nested level merge new key', function () {
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			var state = _get__('fetchReducer')({ foo: 'bar' }, {
				type: _get__('actions').FETCH_RESULT_RECEIVED,
				modelName: 'user.test',
				data: { key: 'value' }
			});
			expect(state).toEqual({
				foo: 'bar',
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value' }
					}
				}
			});
		});

		test('nested level replace existing key', function () {
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			var state = _get__('fetchReducer')({ user: 'bar' }, {
				type: _get__('actions').FETCH_RESULT_RECEIVED,
				modelName: 'user.test',
				data: { key: 'value' }
			});
			expect(state).toEqual({
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value' }
					}
				}
			});
		});

		test('nested level replace existing data on same key', function () {
			// makes sure "data" key gets completely replaced and not merged
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			var state = _get__('fetchReducer')({
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value', key2: 'value2' }
					}
				}
			}, {
				type: _get__('actions').FETCH_RESULT_RECEIVED,
				modelName: 'user.test',
				data: { key: 'value' }
			});
			expect(state).toEqual({
				user: {
					test: {
						isFetching: false,
						hasError: false,
						timedOut: false,
						fetchedAt: fetchedAtDate,
						data: { key: 'value' }
					}
				}
			});
		});
	});

	describe('FETCH_FAILED', function () {
		test('single level', function () {
			var state = _get__('fetchReducer')({}, { type: _get__('actions').FETCH_FAILED, modelName: 'test' });
			expect(state).toEqual({
				test: { isFetching: false, hasError: true, timedOut: false }
			});
		});

		test('nested level', function () {
			var state = _get__('fetchReducer')({}, { type: _get__('actions').FETCH_FAILED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: false, hasError: true, timedOut: false } }
			});
		});

		test('nested level merge state', function () {
			var state = _get__('fetchReducer')({ foo: 'bar' }, { type: _get__('actions').FETCH_FAILED, modelName: 'user.test' });
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: false, hasError: true, timedOut: false } }
			});
		});

		test('nested level replace state', function () {
			var state = _get__('fetchReducer')({ user: 'bar' }, { type: _get__('actions').FETCH_FAILED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: false, hasError: true, timedOut: false } }
			});
		});
	});

	describe('FETCH_TIMED_OUT', function () {
		test('single level', function () {
			var state = _get__('fetchReducer')({}, { type: _get__('actions').FETCH_TIMED_OUT, modelName: 'test' });
			expect(state).toEqual({
				test: { isFetching: false, hasError: true, timedOut: true }
			});
		});

		test('nested level', function () {
			var state = _get__('fetchReducer')({}, { type: _get__('actions').FETCH_TIMED_OUT, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: false, hasError: true, timedOut: true } }
			});
		});

		test('nested level merge state', function () {
			var state = _get__('fetchReducer')({ foo: 'bar' }, { type: _get__('actions').FETCH_TIMED_OUT, modelName: 'user.test' });
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: false, hasError: true, timedOut: true } }
			});
		});

		test('nested level replace state', function () {
			var state = _get__('fetchReducer')({ user: 'bar' }, { type: _get__('actions').FETCH_TIMED_OUT, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: false, hasError: true, timedOut: true } }
			});
		});
	});

	describe('KEY_REMOVAL_REQUESTED', function () {
		test('remove key', function () {
			var state = _get__('fetchReducer')({ test: 'foo' }, { type: _get__('actions').KEY_REMOVAL_REQUESTED, modelName: 'test' });
			expect(state).toEqual({});
		});

		test('remove key nested', function () {
			var state = _get__('fetchReducer')({ test: 'foo', test2: 'bar' }, { type: _get__('actions').KEY_REMOVAL_REQUESTED, modelName: 'test' });
			expect(state).toEqual({ test2: 'bar' });
		});
	});

	describe('Full lifecycle', function () {
		test('default flow', function () {
			var state = {};

			var state2 = _get__('fetchReducer')(state, { type: _get__('actions').FETCH_REQUESTED, modelName: 'test' });
			expect(state2).toEqual({ test: { isFetching: true, hasError: false, timedOut: false } });

			var state3 = _get__('fetchReducer')(state2, {
				type: _get__('actions').FETCH_RESULT_RECEIVED,
				modelName: 'test',
				data: { foo: 'bar' }
			});
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			expect(state3).toEqual({
				test: {
					isFetching: false,
					hasError: false,
					timedOut: false,
					data: { foo: 'bar' },
					fetchedAt: fetchedAtDate
				}
			});

			fetchedAtDate = new Date();
			var state4 = _get__('fetchReducer')(state3, {
				type: _get__('actions').FETCH_RESULT_RECEIVED,
				modelName: 'test',
				data: { baz: 'quux', bleb: 'fleb' }
			});
			expect(state4).toEqual({
				test: {
					isFetching: false,
					hasError: false,
					timedOut: false,
					data: { baz: 'quux', bleb: 'fleb' },
					fetchedAt: fetchedAtDate
				}
			});

			global.Date = _Date;
		});
	});

	describe('default action', function () {
		test("don't do nada", function () {
			var state = _get__('fetchReducer')({ test: 'foo' }, { type: 'FOOBAR', modelName: 'test' });
			expect(state).toEqual({ test: 'foo' });
		});

		test('no state parameter passed', function () {
			var state = _get__('fetchReducer')(undefined, { type: _get__('actions').FETCH_REQUESTED, modelName: 'test' });
			expect(state).toEqual({ test: { isFetching: true, hasError: false, timedOut: false } });
		});
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
		case 'fetchReducer':
			return _fetchReducer2.default;

		case 'actions':
			return _actions2.default;
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