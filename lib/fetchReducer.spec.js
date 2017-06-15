'use strict';

var _fetchReducer = require('./fetchReducer');

var _fetchReducer2 = _interopRequireDefault(_fetchReducer);

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('fetchReducer', function () {
	test('Do nothing without action.modelName', function () {
		var state = (0, _fetchReducer2.default)({ foo: 'bar' }, {});
		expect(state).toEqual({ foo: 'bar' });
	});

	describe('FETCH_REQUESTED', function () {
		test('single level', function () {
			var state = (0, _fetchReducer2.default)({}, { type: _actions2.default.FETCH_REQUESTED, modelName: 'test' });
			expect(state).toEqual({
				test: { isFetching: true, hasError: false, timedOut: false }
			});
		});

		test('nested level', function () {
			var state = (0, _fetchReducer2.default)({}, { type: _actions2.default.FETCH_REQUESTED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			});
		});

		test('nested level merge state', function () {
			var state = (0, _fetchReducer2.default)({ foo: 'bar' }, { type: _actions2.default.FETCH_REQUESTED, modelName: 'user.test' });
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: true, hasError: false, timedOut: false } }
			});
		});

		test('nested level replace state', function () {
			var state = (0, _fetchReducer2.default)({ user: { foo: 'bar' } }, { type: _actions2.default.FETCH_REQUESTED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { foo: 'bar', test: { isFetching: true, hasError: false, timedOut: false } }
			});
		});

		test('should preserve data key while fetching', function () {
			var state = (0, _fetchReducer2.default)({
				test: {
					data: { foo: 'bar' },
					isFetching: false,
					hasError: false,
					timedOut: false
				}
			}, { type: _actions2.default.FETCH_REQUESTED, modelName: 'test' });
			expect(state).toEqual({
				test: {
					data: { foo: 'bar' },
					isFetching: true,
					hasError: false,
					timedOut: false
				}
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
			var state = (0, _fetchReducer2.default)({}, {
				type: _actions2.default.FETCH_RESULT_RECEIVED,
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
			var state = (0, _fetchReducer2.default)({}, {
				type: _actions2.default.FETCH_RESULT_RECEIVED,
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

		test('nested add sibling key', function () {
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			var state = (0, _fetchReducer2.default)({ foo: 'bar' }, {
				type: _actions2.default.FETCH_RESULT_RECEIVED,
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
			var state = (0, _fetchReducer2.default)({
				user: {
					test: { key: 'oldValue' }
				}
			}, {
				type: _actions2.default.FETCH_RESULT_RECEIVED,
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

		test('nested level merge existing key', function () {
			var fetchedAtDate = new Date();
			var _Date = Date;
			global.Date = jest.fn(function () {
				return fetchedAtDate;
			});
			var state = (0, _fetchReducer2.default)({
				user: {
					existingKey: { foo: 'bar' }
				}
			}, {
				type: _actions2.default.FETCH_RESULT_RECEIVED,
				modelName: 'user.test',
				data: { key: 'value' }
			});
			expect(state).toEqual({
				user: {
					existingKey: { foo: 'bar' },
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
			var state = (0, _fetchReducer2.default)({
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
				type: _actions2.default.FETCH_RESULT_RECEIVED,
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
			var state = (0, _fetchReducer2.default)({}, { type: _actions2.default.FETCH_FAILED, modelName: 'test' });
			expect(state).toEqual({
				test: { isFetching: false, hasError: true, timedOut: false }
			});
		});

		test('nested level', function () {
			var state = (0, _fetchReducer2.default)({}, { type: _actions2.default.FETCH_FAILED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: false, hasError: true, timedOut: false } }
			});
		});

		test('nested level merge state', function () {
			var state = (0, _fetchReducer2.default)({ foo: 'bar' }, { type: _actions2.default.FETCH_FAILED, modelName: 'user.test' });
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: false, hasError: true, timedOut: false } }
			});
		});

		test('nested level replace state', function () {
			var state = (0, _fetchReducer2.default)({ user: { foo: 'bar' } }, { type: _actions2.default.FETCH_FAILED, modelName: 'user.test' });
			expect(state).toEqual({
				user: { foo: 'bar', test: { isFetching: false, hasError: true, timedOut: false } }
			});
		});
	});

	describe('FETCH_TIMED_OUT', function () {
		test('single level', function () {
			var state = (0, _fetchReducer2.default)({}, { type: _actions2.default.FETCH_TIMED_OUT, modelName: 'test' });
			expect(state).toEqual({
				test: { isFetching: false, hasError: true, timedOut: true }
			});
		});

		test('nested level', function () {
			var state = (0, _fetchReducer2.default)({}, { type: _actions2.default.FETCH_TIMED_OUT, modelName: 'user.test' });
			expect(state).toEqual({
				user: { test: { isFetching: false, hasError: true, timedOut: true } }
			});
		});

		test('nested level merge state', function () {
			var state = (0, _fetchReducer2.default)({ foo: 'bar' }, { type: _actions2.default.FETCH_TIMED_OUT, modelName: 'user.test' });
			expect(state).toEqual({
				foo: 'bar',
				user: { test: { isFetching: false, hasError: true, timedOut: true } }
			});
		});

		test('nested level replace state', function () {
			var state = (0, _fetchReducer2.default)({ user: { foo: 'bar' } }, { type: _actions2.default.FETCH_TIMED_OUT, modelName: 'user.test' });
			expect(state).toEqual({
				user: { foo: 'bar', test: { isFetching: false, hasError: true, timedOut: true } }
			});
		});
	});

	describe('KEY_REMOVAL_REQUESTED', function () {
		test('remove key', function () {
			var state = (0, _fetchReducer2.default)({ test: { foo: 'bar' } }, { type: _actions2.default.KEY_REMOVAL_REQUESTED, modelName: 'test' });
			expect(state).toEqual({});
		});

		test('remove key nested', function () {
			var state = (0, _fetchReducer2.default)({ test: 'foo', test2: 'bar' }, { type: _actions2.default.KEY_REMOVAL_REQUESTED, modelName: 'test' });
			expect(state).toEqual({ test2: 'bar' });
		});
	});

	describe('Full lifecycle', function () {
		test('default flow', function () {
			var state = {};

			var state2 = (0, _fetchReducer2.default)(state, { type: _actions2.default.FETCH_REQUESTED, modelName: 'test' });
			expect(state2).toEqual({ test: { isFetching: true, hasError: false, timedOut: false } });

			var state3 = (0, _fetchReducer2.default)(state2, {
				type: _actions2.default.FETCH_RESULT_RECEIVED,
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
			var state4 = (0, _fetchReducer2.default)(state3, {
				type: _actions2.default.FETCH_RESULT_RECEIVED,
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
			var state = (0, _fetchReducer2.default)({ test: 'foo' }, { type: 'FOOBAR', modelName: 'test' });
			expect(state).toEqual({ test: 'foo' });
		});

		test('no state parameter passed', function () {
			var state = (0, _fetchReducer2.default)(undefined, { type: _actions2.default.FETCH_REQUESTED, modelName: 'test' });
			expect(state).toEqual({ test: { isFetching: true, hasError: false, timedOut: false } });
		});
	});
});