'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

exports.default = fetchSaga;

var _reduxSaga = require('redux-saga');

var _effects = require('redux-saga/effects');

var _fetchService = require('./services/fetchService');

var _actions = require('./actions');

var _actions2 = _interopRequireDefault(_actions);

var _utilities = require('./utilities');

var _utilities2 = _interopRequireDefault(_utilities);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _marked = [fetchData, fetchOnce, fetchDataLoop, fetchDataRecurring, fetchLatest, interceptOauthToken, fetchSaga].map(_regenerator2.default.mark);

var logger = void 0,
    models = void 0;
var oauthToken = void 0;

function fetchData(action) {
	var tryLimit, tryCount, didFail, lastError, baseConfig, authHeaders, _headers, fetchConfig, _ref, fetchResult, timedOut;

	return _regenerator2.default.wrap(function fetchData$(_context) {
		while (1) {
			switch (_context.prev = _context.next) {
				case 0:
					if (action.modelName) {
						_context.next = 2;
						break;
					}

					throw new Error("'modelName' config parameter is required for fetchData");

				case 2:

					// Configure retry
					tryLimit = action.noRetry ? 0 : 4;
					tryCount = 0;
					didFail = void 0;
					lastError = '';

					// Run retry loop

				case 6:
					didFail = false;
					tryCount++;
					_context.prev = 8;
					_context.next = 11;
					return (0, _effects.put)((0, _actions.createAction)(action.noStore ? _actions2.default.TRANSIENT_FETCH_REQUESTED : _actions2.default.FETCH_REQUESTED, { modelName: action.modelName }));

				case 11:

					// Get fetch parameters from global fetch dictionary using the modelName passed in to locate them
					// Combine parameters from global dictionary with any passed in - locals override dictionary
					baseConfig = (0, _utilities2.default)(models, action.modelName);

					if (baseConfig) {
						_context.next = 14;
						break;
					}

					throw new Error('Cannot find \'' + action.modelName + '\' model in model dictionary');

				case 14:
					// Avoiding pulling in a lib to do deep copy here. Hand crafted. Locally owned.
					// If body is string, pass it directly (to handle content-type: x-www-form-urlencoded)
					authHeaders = {};

					if (oauthToken) {
						authHeaders['Authorization'] = 'Bearer ' + oauthToken.access_token;
					}
					_headers = Object.assign({}, baseConfig.headers, action.headers, authHeaders);
					fetchConfig = Object.assign({}, baseConfig, {
						headers: _headers
					});

					if (action.body || baseConfig.body) {
						// If the body is a string, we are assuming it's an application/x-www-form-urlencoded
						if (typeof action.body === 'string') {
							fetchConfig.body = action.body;
						} else {
							fetchConfig.body = Object.assign({}, baseConfig.body, action.body);
						}
					}
					fetchConfig.queryParams = Object.assign({}, baseConfig.queryParams, action.queryParams);
					_context.next = 22;
					return (0, _effects.race)({
						fetchResult: (0, _effects.call)(_fetchService.doFetch, fetchConfig),
						timedOut: (0, _effects.call)(_reduxSaga.delay, action.timeLimit ? action.timeLimit : 3000)
					});

				case 22:
					_ref = _context.sent;
					fetchResult = _ref.fetchResult;
					timedOut = _ref.timedOut;

					if (!(fetchResult && !(fetchResult.title && fetchResult.title === 'Error'))) {
						_context.next = 30;
						break;
					}

					_context.next = 28;
					return (0, _effects.put)((0, _actions.createAction)(action.noStore ? _actions2.default.TRANSIENT_FETCH_RESULT_RECEIVED : _actions2.default.FETCH_RESULT_RECEIVED, { data: fetchResult, modelName: action.modelName }));

				case 28:
					_context.next = 38;
					break;

				case 30:
					if (!timedOut) {
						_context.next = 35;
						break;
					}

					_context.next = 33;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_TIMED_OUT, {
						modelName: action.modelName
					}));

				case 33:
					_context.next = 38;
					break;

				case 35:
					_context.next = 37;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_TRY_FAILED, {
						modelName: action.modelName,
						errorData: fetchResult
					}));

				case 37:
					throw new Error();

				case 38:
					_context.next = 48;
					break;

				case 40:
					_context.prev = 40;
					_context.t0 = _context['catch'](8);

					didFail = true;
					lastError = _context.t0;
					logger.log('fetchData fail');
					logger.log(_context.t0);
					_context.next = 48;
					return (0, _effects.call)(_reduxSaga.delay, 2 ^ tryCount * 100);

				case 48:
					if (tryCount < tryLimit && didFail) {
						_context.next = 6;
						break;
					}

				case 49:
					if (!(tryCount === tryLimit && didFail)) {
						_context.next = 54;
						break;
					}

					_context.next = 52;
					return (0, _effects.put)((0, _actions.createAction)(_actions2.default.FETCH_FAILED, { modelName: action.modelName }));

				case 52:
					logger.log('fetchData retry fail');
					logger.log(lastError);

				case 54:
				case 'end':
					return _context.stop();
			}
		}
	}, _marked[0], this, [[8, 40]]);
}

function fetchOnce(action) {
	return _regenerator2.default.wrap(function fetchOnce$(_context2) {
		while (1) {
			switch (_context2.prev = _context2.next) {
				case 0:
					_context2.next = 2;
					return (0, _effects.call)(fetchData, action);

				case 2:
				case 'end':
					return _context2.stop();
			}
		}
	}, _marked[1], this);
}

function fetchDataLoop(config) {
	return _regenerator2.default.wrap(function fetchDataLoop$(_context3) {
		while (1) {
			switch (_context3.prev = _context3.next) {
				case 0:
					_context3.prev = 0;

				case 1:
					if (!true) {
						_context3.next = 8;
						break;
					}

					_context3.next = 4;
					return (0, _effects.call)(fetchData, config);

				case 4:
					_context3.next = 6;
					return (0, _effects.call)(_reduxSaga.delay, config.period);

				case 6:
					_context3.next = 1;
					break;

				case 8:
					_context3.prev = 8;

					(0, _effects.put)(_actions2.default.PERIODIC_TERMINATION_SUCCEEDED);
					return _context3.finish(8);

				case 11:
				case 'end':
					return _context3.stop();
			}
		}
	}, _marked[2], this, [[0,, 8, 11]]);
}

function fetchDataRecurring(config) {
	var bgSyncTask;
	return _regenerator2.default.wrap(function fetchDataRecurring$(_context4) {
		while (1) {
			switch (_context4.prev = _context4.next) {
				case 0:
					if (config.period) {
						_context4.next = 2;
						break;
					}

					throw new Error("'period' config parameter is required for fetchDataRecurring");

				case 2:
					if (config.taskId) {
						_context4.next = 4;
						break;
					}

					throw new Error("'taskId' config parameter is required for fetchDataRecurring");

				case 4:
					_context4.next = 6;
					return (0, _effects.fork)(fetchDataLoop, config);

				case 6:
					bgSyncTask = _context4.sent;
					_context4.next = 9;
					return (0, _effects.take)(function (action) {
						return action.type === _actions2.default.PERIODIC_TERMINATION_REQUESTED && action.taskId === config.taskId;
					});

				case 9:
					_context4.next = 11;
					return (0, _effects.cancel)(bgSyncTask);

				case 11:
				case 'end':
					return _context4.stop();
			}
		}
	}, _marked[3], this);
}

function fetchLatest(config) {
	return _regenerator2.default.wrap(function fetchLatest$(_context5) {
		while (1) {
			switch (_context5.prev = _context5.next) {
				case 0:
					_context5.next = 2;
					return (0, _effects.call)(fetchData, config);

				case 2:
				case 'end':
					return _context5.stop();
			}
		}
	}, _marked[4], this);
}

function interceptOauthToken(action) {
	return _regenerator2.default.wrap(function interceptOauthToken$(_context6) {
		while (1) {
			switch (_context6.prev = _context6.next) {
				case 0:
					oauthToken = action.oauthToken;

				case 1:
				case 'end':
					return _context6.stop();
			}
		}
	}, _marked[5], this);
}

var consoleLogger = {
	log: function log(error) {
		console.log(error);
	}
};

function fetchSaga(modelsParam, apiRootParam) {
	var loggerParam = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : consoleLogger;
	return _regenerator2.default.wrap(function fetchSaga$(_context7) {
		while (1) {
			switch (_context7.prev = _context7.next) {
				case 0:
					if (modelsParam) {
						_context7.next = 2;
						break;
					}

					throw new Error("'modelsParam' is required for fetchSaga");

				case 2:
					(0, _fetchService.setApiRoot)(apiRootParam);
					logger = loggerParam;
					models = modelsParam;

					_context7.next = 7;
					return (0, _effects.takeEvery)(_actions2.default.DATA_REQUESTED, fetchOnce);

				case 7:
					_context7.next = 9;
					return (0, _effects.takeEvery)(_actions2.default.PERIODIC_DATA_REQUESTED, fetchDataRecurring);

				case 9:
					_context7.next = 11;
					return (0, _effects.takeLatest)(_actions2.default.DATA_REQUESTED_USE_LATEST, fetchLatest);

				case 11:
					_context7.next = 13;
					return (0, _effects.takeLatest)('auth/GET_TOKEN_SUCCEEDED', interceptOauthToken);

				case 13:
					_context7.next = 15;
					return (0, _effects.takeLatest)('auth/TOKEN_REFRESH_SUCCEEDED', interceptOauthToken);

				case 15:
				case 'end':
					return _context7.stop();
			}
		}
	}, _marked[6], this);
}