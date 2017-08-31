'use strict';

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _reduxSaga = require('redux-saga');

var _effects = require('redux-saga/effects');

var _utils = require('redux-saga/utils');

var _fetchService = require('./services/fetchService');

var _fetchSaga = require('./fetchSaga');

var _fetchSaga2 = _interopRequireDefault(_fetchSaga);

var _fetchReducer = require('./fetchReducer');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO: retry
var fetchData = _fetchSaga.__RewireAPI__.__get__('fetchData');
var fetchOnce = _fetchSaga.__RewireAPI__.__get__('fetchOnce');
var matchesTerminationAction = _fetchSaga.__RewireAPI__.__get__('matchesTerminationAction');
var fetchDataRecurring = _fetchSaga.__RewireAPI__.__get__('fetchDataRecurring');
var fetchDataLoop = _fetchSaga.__RewireAPI__.__get__('fetchDataLoop');

var consoleOutput = void 0;
var _consoleLog = console.debug;

beforeAll(function () {
	console.debug = jest.fn(function (message) {
		consoleOutput = message;
	});
});

afterAll(function () {
	console.debug = _consoleLog;
});

describe('fetchData', function () {
	test('should throw without action.modelName', function () {
		var gen = fetchData();
		expect(function () {
			gen.next();
		}).toThrow(/'modelName' config parameter is required/);
	});

	var getOauthToken = function getOauthToken() {
		return { access_token: 'some-access-token' };
	};
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
		}, 'http://google.com', getOauthToken, function () {} // no need for error logging here
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
		expect(gen.next().value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_REQUESTED, {
			modelName: 'test'
		})));
	});

	test('should add oauth token to header if it exists', function () {
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		expect(gen.next().value).toEqual((0, _effects.race)({
			fetchResult: (0, _effects.call)(_fetchService.doFetch, {
				path: 'http://www.google.com',
				headers: { Authorization: 'Bearer some-access-token' },
				queryParams: {}
			}),
			timedOut: (0, _effects.call)(_reduxSaga.delay, 30000)
		}));
	});

	test('should execute basic fetch', function () {
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		gen.next();
		expect(gen.next({ fetchResult: { foo: 'bar' } }).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_RESULT_RECEIVED, { data: { foo: 'bar' }, modelName: 'test' })));
		expect(gen.next().done).toEqual(true);
	});

	test('should execute basic transient fetch', function () {
		var gen = fetchData({ modelName: 'test', noStore: true });
		gen.next();
		gen.next();
		expect(gen.next({ fetchResult: { foo: 'bar' } }).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.TRANSIENT_FETCH_RESULT_RECEIVED, {
			data: { foo: 'bar' },
			modelName: 'test'
		})));
		expect(gen.next().done).toEqual(true);
	});

	test('should replace baseConfig body as string if body is string', function () {
		var gen = fetchData({ modelName: 'test2', body: 'body' });
		gen.next();
		expect(gen.next().value).toEqual((0, _effects.race)({
			fetchResult: (0, _effects.call)(_fetchService.doFetch, {
				path: 'http://news.ycombinator.com',
				headers: { Authorization: 'Bearer some-access-token' },
				queryParams: {},
				body: 'body'
			}),
			timedOut: (0, _effects.call)(_reduxSaga.delay, 30000)
		}));
	});

	test('should merge body as JSON if body is JSON', function () {
		var gen = fetchData({ modelName: 'test3', body: { baz: 'quux' } });
		gen.next();
		expect(gen.next().value).toEqual((0, _effects.race)({
			fetchResult: (0, _effects.call)(_fetchService.doFetch, {
				path: 'http://news.ycombinator.com',
				headers: { Authorization: 'Bearer some-access-token' },
				queryParams: {},
				body: {
					foo: 'bar',
					baz: 'quux'
				}
			}),
			timedOut: (0, _effects.call)(_reduxSaga.delay, 30000)
		}));
	});

	test('should populate parameter in path', function () {
		var gen = fetchData({ modelName: 'test4' });
		gen.next();
		gen.next({ testServer: 'baz' });
		expect(gen.next().value).toEqual((0, _effects.race)({
			fetchResult: (0, _effects.call)(_fetchService.doFetch, {
				path: 'http://baz',
				headers: { Authorization: 'Bearer some-access-token' },
				queryParams: {}
			}),
			timedOut: (0, _effects.call)(_reduxSaga.delay, 30000)
		}));
	});

	test('should retry when fetch times out', function () {
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		gen.next();
		expect(gen.next({ timedOut: true }).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_TIMED_OUT, { modelName: 'test' })));
		gen.next();
		expect(gen.next().value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_REQUESTED, { modelName: 'test' })));
	});

	test('should not retry when fetch times out and noRetry is specified', function () {
		var gen = fetchData({ modelName: 'test', noRetry: true });
		gen.next();
		gen.next();
		expect(gen.next({ timedOut: true }).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_TIMED_OUT, { modelName: 'test' })));
		gen.next();
		expect(gen.next().done).toEqual(true);
	});

	test('should time out to a configurable value', function () {
		var gen = fetchData({ modelName: 'test', timeLimit: 1000 });
		gen.next();
		expect(gen.next().value).toEqual((0, _effects.race)({
			fetchResult: (0, _effects.call)(_fetchService.doFetch, {
				path: 'http://www.google.com',
				headers: { Authorization: 'Bearer some-access-token' },
				queryParams: {}
			}),
			timedOut: (0, _effects.call)(_reduxSaga.delay, 1000)
		}));
	});

	test('should retry on fetch error', function () {
		var gen = fetchData({ modelName: 'test' });
		gen.next();
		gen.next();
		expect(gen.next({ fetchResult: { title: 'Error' } }).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_TRY_FAILED, { modelName: 'test', errorData: { title: 'Error' } })));
		gen.next();
		expect(gen.next().value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_REQUESTED, { modelName: 'test' })));
	});

	test('should dispatch FETCH_FAILED when all retries have failed', function () {
		var gen = fetchData({ modelName: 'test' });
		for (var i = 0; i <= 3; i++) {
			gen.next();
			gen.next();
			expect(gen.next({ fetchResult: { title: 'Error' } }).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_TRY_FAILED, {
				modelName: 'test',
				errorData: { title: 'Error' }
			})));
			gen.next();
		}
		expect(gen.next().value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_FAILED, { modelName: 'test' })));
		expect(gen.next().done).toEqual(true);
	});

	test('should not dispatch FETCH_FAILED when all retries were timeouts', function () {
		var gen = fetchData({ modelName: 'test' });
		for (var i = 0; i <= 3; i++) {
			gen.next();
			gen.next();
			expect(gen.next({ timedOut: true }).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_TIMED_OUT, {
				modelName: 'test'
			})));
			gen.next();
		}

		expect(gen.next().done).toEqual(true);
	});
});

describe('fetchOnce', function () {
	test('should call fetchData exactly once', function () {
		var gen = fetchOnce({ modelName: 'foo' });
		expect(gen.next().value).toEqual((0, _effects.call)(fetchData, { modelName: 'foo' }));
		expect(gen.next().done).toEqual(true);
	});
});

describe('fetchDataLoop', function () {
	test('should fetch repeatedly until terminated', function () {
		var gen = fetchDataLoop({ modelName: 'foo', period: 1000 });
		expect(gen.next().value).toEqual((0, _effects.call)(fetchData, { modelName: 'foo', period: 1000 }));
		expect(gen.next().value).toEqual((0, _effects.call)(_reduxSaga.delay, 1000));

		expect(gen.next().value).toEqual((0, _effects.call)(fetchData, { modelName: 'foo', period: 1000 }));
		expect(gen.next().value).toEqual((0, _effects.call)(_reduxSaga.delay, 1000));

		expect(gen.return().value).toEqual((0, _effects.cancelled)());

		expect(gen.next(true).value).toEqual((0, _effects.put)((0, _actions.createAction)(_actions2.default.PERIODIC_TERMINATION_SUCCEEDED, {
			modelName: 'foo'
		})));
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
		expect(matchesTerminationAction({ type: 'foo' }, { period: 1000, taskId: 'fooTask' })).toEqual(false);
	});

	test('should not cancel if action is a cancel for another task', function () {
		expect(matchesTerminationAction({
			type: _actions2.default.PERIODIC_TERMINATION_REQUESTED,
			taskId: 'someOtherTask'
		}, { period: 1000, taskId: 'fooTask' })).toEqual(false);
	});

	test('should cancel if action is a cancel for that task', function () {
		expect(matchesTerminationAction({
			type: _actions2.default.PERIODIC_TERMINATION_REQUESTED,
			taskId: 'fooTask'
		}, { period: 1000, taskId: 'fooTask' })).toEqual(true);
	});
	test('should cancel once take matches action', function () {
		var action = { period: 1000, taskId: 'fooTask' };
		var gen = fetchDataRecurring(action);
		gen.next();
		var mockTask = (0, _utils.createMockTask)();
		gen.next(mockTask);
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

		expect(gen.next().value).toEqual((0, _effects.takeEvery)(_actions2.default.DATA_REQUESTED, fetchOnce));
		expect(gen.next().value).toEqual((0, _effects.takeEvery)(_actions2.default.PERIODIC_DATA_REQUESTED, fetchDataRecurring));
		expect(gen.next().value).toEqual((0, _effects.takeLatest)(_actions2.default.DATA_REQUESTED_USE_LATEST, fetchOnce));
	});

	test('should use default logger', function () {
		var gen = (0, _fetchSaga2.default)({ test: { path: '/foo' } }, '');
		expect(consoleOutput).toEqual('logger set to consoleLogger');
	});
});