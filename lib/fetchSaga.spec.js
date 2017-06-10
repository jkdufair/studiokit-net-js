'use strict';

var _fetchSaga = require('./fetchSaga');

var _fetchSaga2 = _interopRequireDefault(_fetchSaga);

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _effects = require('redux-saga/effects');

var _utils = require('redux-saga/utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO: retry
var fetchData = _fetchSaga.__RewireAPI__.__get__('fetchData');
var fetchOnce = _fetchSaga.__RewireAPI__.__get__('fetchOnce');
var fetchDataRecurring = _fetchSaga.__RewireAPI__.__get__('fetchDataRecurring');
var fetchDataLoop = _fetchSaga.__RewireAPI__.__get__('fetchDataLoop');
var interceptOauthToken = _fetchSaga.__RewireAPI__.__get__('interceptOauthToken');

describe('fetchData', function () {
	test('should throw without action.modelName', function () {
		var gen = fetchData();
		expect(function () {
			gen.next();
		}).toThrow(/'modelName' config parameter is required/);
	});

	var fetchSagaGen = void 0;
	beforeEach(function () {
		fetchSagaGen = (0, _fetchSaga2.default)({
			test: {
				path: 'http://www.google.com'
			},
			test2: {
				path: 'http://news.ycombinator.com',
				body: 'string'
			},
			test3: {
				path: 'http://news.ycombinator.com',
				body: { foo: 'bar' }
			},
			test4: {
				path: 'http://{{testServer}}'
			}
		}, 'http://google.com', function () {} // no need for error logging here
		);
		fetchSagaGen.next();
	});

	// NOTE: first yield PUTs FETCH_REQUESTED
	// second yield is the RACE that does the fetch or times out
	//(unless there is a parameterized path which has one yield before these two)
	test('should throw when action.modelName is not found in models', function () {
		var gen = fetchData({ modelName: 'foo' });
		expect(function () {
			gen.next();
			gen.next();
		}).toThrow(/Cannot find 'foo' model in model dictionary/);
	});

	test('should emit FETCH_REQUESTED', function () {
		var gen = fetchData({ modelName: 'test' });
		var r1 = gen.next();
		expect(r1.value.PUT.action).toEqual({ type: _actions2.default.FETCH_REQUESTED, modelName: 'test' });
	});

	test('should add oauth token to header if it exists', function () {
		interceptOauthToken({ oauthToken: { access_token: 'some-access-token' } });
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		var result = gen.next();
		expect(result.value.RACE.fetchResult.CALL.args[0].headers).toEqual({
			Authorization: 'Bearer some-access-token'
		});
		interceptOauthToken({ oauthToken: undefined });
	});

	test('should execute basic fetch', function () {
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		gen.next();
		var result = gen.next({ fetchResult: { foo: 'bar' } });
		expect(result.value.PUT.action).toEqual({
			type: _actions2.default.FETCH_RESULT_RECEIVED,
			data: { foo: 'bar' },
			modelName: 'test'
		});
		var doneResult = gen.next();
		expect(doneResult.done).toEqual(true);
	});

	test('should execute basic transient fetch', function () {
		var gen = fetchData({ modelName: 'test', noStore: true });
		gen.next();
		gen.next();
		var result = gen.next({ fetchResult: { foo: 'bar' } });
		expect(result.value.PUT.action).toEqual({
			type: _actions2.default.TRANSIENT_FETCH_RESULT_RECEIVED,
			data: { foo: 'bar' },
			modelName: 'test'
		});
		var doneResult = gen.next();
		expect(doneResult.done).toEqual(true);
	});

	test('should replace baseConfig body as string if body is string', function () {
		var gen = fetchData({ modelName: 'test2', body: 'body' });
		gen.next();
		var result = gen.next();
		expect(result.value.RACE.fetchResult.CALL.args[0].body).toEqual('body');
	});

	test('should merge body as JSON if body is JSON', function () {
		var gen = fetchData({ modelName: 'test3', body: { baz: 'quux' } });
		gen.next();
		var result = gen.next();
		expect(result.value.RACE.fetchResult.CALL.args[0].body).toEqual({
			foo: 'bar',
			baz: 'quux'
		});
	});

	test('should populate parameter in path', function () {
		var gen = fetchData({ modelName: 'test4' });
		gen.next();
		gen.next({ testServer: 'baz' });
		var result = gen.next({ fetchResult: { foo: 'bar' } });
		expect(result.value.RACE.fetchResult.CALL.args[0].path).toEqual('http://baz');
	});

	test('should return entire store for parameter replacement', function () {
		var gen = fetchData({ modelName: 'test4' });
		var result = gen.next();
		var result2 = result.value.SELECT.selector({ foo: 'bar' });
		expect(result2).toEqual({ foo: 'bar' });
	});

	test('should retry when fetch times out', function () {
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		gen.next();
		var result = gen.next({ timedOut: true });
		expect(result.value.PUT.action).toEqual({ type: _actions2.default.FETCH_TIMED_OUT, modelName: 'test' });
		gen.next();
		expect(gen.next().value.PUT.action).toEqual({
			type: _actions2.default.FETCH_REQUESTED,
			modelName: 'test'
		});
	});

	test('should not retry when fetch times out and noRetry is specified', function () {
		var gen = fetchData({ modelName: 'test', noRetry: true });
		gen.next();
		gen.next();
		var result = gen.next({ timedOut: true });
		expect(result.value.PUT.action).toEqual({ type: _actions2.default.FETCH_TIMED_OUT, modelName: 'test' });
		gen.next();
		expect(gen.next().done).toEqual(true);
	});

	test('should time out to a configurable value', function () {
		var gen = fetchData({ modelName: 'test', timeLimit: 1000 });
		gen.next();
		expect(gen.next().value.RACE.timedOut.CALL.args[0]).toEqual(1000);
	});

	test('should retry on fetch error', function () {
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		gen.next();
		var result = gen.next({ fetchResult: { title: 'Error' } });
		expect(result.value.PUT.action).toEqual({
			type: 'net/FETCH_TRY_FAILED',
			modelName: 'test',
			errorData: { title: 'Error' }
		});
		gen.next();
		expect(gen.next().value.PUT.action).toEqual({
			type: 'net/FETCH_REQUESTED',
			modelName: 'test'
		});
	});

	test('should dispatch when all retries have failed', function () {
		var gen = fetchData({ modelName: 'test' });
		for (var i = 0; i <= 3; i++) {
			gen.next();
			gen.next();
			var result = gen.next({ fetchResult: { title: 'Error' } });
			expect(result.value.PUT.action).toEqual({
				type: 'net/FETCH_TRY_FAILED',
				modelName: 'test',
				errorData: { title: 'Error' }
			});
			gen.next();
		}
		expect(gen.next().value.PUT.action).toEqual({ type: _actions2.default.FETCH_FAILED, modelName: 'test' });
		gen.next();
	});
});

describe('fetchOnce', function () {
	test('should call fetchData exactly once', function () {
		var gen = fetchOnce({ modelName: 'foo' });
		var result = gen.next();
		expect(result.value.CALL.fn.name).toEqual('fetchData');
		expect(result.value.CALL.args[0]).toEqual({ modelName: 'foo' });
		expect(gen.next().done).toEqual(true);
	});
});

describe('fetchDataLoop', function () {
	test('should fetch repeatedly until terminated', function () {
		var gen = fetchDataLoop({ modelName: 'foo', period: 1000 });
		var result = gen.next();
		expect(result.value.CALL.fn.name).toEqual('fetchData');
		expect(result.value.CALL.args[0]).toEqual({ modelName: 'foo', period: 1000 });
		result = gen.next();
		expect(result.value.CALL.fn.name).toEqual('delay');
		expect(result.value.CALL.args[0]).toEqual(1000);

		result = gen.next();
		expect(result.value.CALL.fn.name).toEqual('fetchData');
		expect(result.value.CALL.args[0]).toEqual({ modelName: 'foo', period: 1000 });
		result = gen.next();
		expect(result.value.CALL.fn.name).toEqual('delay');
		expect(result.value.CALL.args[0]).toEqual(1000);

		result = gen.return(); // cancel task
		expect(result.value.PUT.action).toEqual(_actions2.default.PERIODIC_TERMINATION_SUCCEEDED);
		expect(gen.next().done).toEqual(true);
	});
});

describe('fetchDataRecurring', function () {
	test('should throw without action', function () {
		var gen = fetchDataRecurring();
		expect(function () {
			gen.next();
		}).toThrow(/'period' config parameter is required for fetchDataRecurring/);
	});

	test('should throw without action.period', function () {
		var gen = fetchDataRecurring({});
		expect(function () {
			gen.next();
		}).toThrow(/'period' config parameter is required for fetchDataRecurring/);
	});

	test('should throw without action.taskId', function () {
		var gen = fetchDataRecurring({ period: 1000 });
		expect(function () {
			gen.next();
		}).toThrow(/'taskId' config parameter is required for fetchDataRecurring/);
	});

	test('should fork off fetchData loop if all params are given', function () {
		var action = { period: 1000, taskId: 'fooTask' };
		var gen = fetchDataRecurring(action);
		expect(gen.next().value).toEqual((0, _effects.fork)(fetchDataLoop, action));
	});

	test('should not cancel if action is not a cancel for that task', function () {
		var action = { period: 1000, taskId: 'fooTask' };
		var gen = fetchDataRecurring(action);
		gen.next();
		var result = gen.next((0, _utils.createMockTask)());
		expect(result.value.TAKE.pattern({ type: 'foo' })).toEqual(false);
	});

	test('should not cancel if action is a cancel for another task', function () {
		var action = { period: 1000, taskId: 'fooTask' };
		var gen = fetchDataRecurring(action);
		gen.next();
		var result = gen.next((0, _utils.createMockTask)());
		expect(result.value.TAKE.pattern({
			type: _actions2.default.PERIODIC_TERMINATION_REQUESTED,
			taskId: 'someOtherTask'
		})).toEqual(false);
	});

	test('should cancel if action is a cancel for that task', function () {
		var action = { period: 1000, taskId: 'fooTask' };
		var gen = fetchDataRecurring(action);
		gen.next();
		var mockTask = (0, _utils.createMockTask)();
		var result = gen.next(mockTask);
		expect(result.value.TAKE.pattern({
			type: _actions2.default.PERIODIC_TERMINATION_REQUESTED,
			taskId: 'fooTask'
		})).toEqual(true);
		expect(gen.next().value).toEqual((0, _effects.cancel)(mockTask));
	});
});

describe('fetchSaga', function () {
	test('should throw without models', function () {
		var gen = (0, _fetchSaga2.default)();
		expect(function () {
			gen.next();
		}).toThrow(/'modelsParam' is required for fetchSaga/);
	});

	test('should set up all takes', function () {
		var gen = (0, _fetchSaga2.default)({});

		var result1 = gen.next();
		expect(result1.value.FORK.args[0]).toEqual(_actions2.default.DATA_REQUESTED);
		expect(result1.value.FORK.args[1].name).toEqual('fetchOnce');

		var result2 = gen.next();
		expect(result2.value.FORK.args[0]).toEqual(_actions2.default.PERIODIC_DATA_REQUESTED);
		expect(result2.value.FORK.args[1].name).toEqual('fetchDataRecurring');

		var result3 = gen.next();
		expect(result3.value.FORK.args[0]).toEqual(_actions2.default.DATA_REQUESTED_USE_LATEST);
		expect(result3.value.FORK.args[1].name).toEqual('fetchOnce');

		var result4 = gen.next();
		expect(result4.value.FORK.args[0]).toEqual('auth/GET_TOKEN_SUCCEEDED');
		expect(result4.value.FORK.args[1].name).toEqual('interceptOauthToken');

		var result5 = gen.next();
		expect(result5.value.FORK.args[0]).toEqual('auth/TOKEN_REFRESH_SUCCEEDED');
		expect(result5.value.FORK.args[1].name).toEqual('interceptOauthToken');
	});

	test('should use default logger', function () {
		var gen = (0, _fetchSaga2.default)({ test: { path: '/foo' } }, '');
		gen.next();
		var gen2 = fetchData({ modelName: 'test' });
		gen2.next();
		gen2.next();
		var result = gen2.next({ fetchResult: { title: 'Error' } });
		expect(result.value.PUT.action).toEqual({
			type: 'net/FETCH_TRY_FAILED',
			modelName: 'test',
			errorData: { title: 'Error' }
		});
		gen2.next();
		expect(gen2.next().value.PUT.action).toEqual({
			type: 'net/FETCH_REQUESTED',
			modelName: 'test'
		});
	});
});