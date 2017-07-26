// @flow

import { delay } from 'redux-saga'
import {
	call,
	cancel,
	cancelled,
	fork,
	put,
	race,
	select,
	take,
	takeEvery,
	takeLatest
} from 'redux-saga/effects'
import _ from 'lodash'
import { doFetch, setApiRoot } from './services/fetchService'
import actions, { createAction } from './actions'

/**
 * Oauth token as generated by OWIN.NET.
 * 
 */
type OAuthToken = {
	access_token: string,
	refresh_token: string,
	token_type: string,
	expires_in: number,
	client_id: string,
	'.issued': string,
	'.expires': string
}

/**
 * modelName - The key that is used to locate the request config in apis.js and also to place the result in the redux store
 * headers - (optional) An object as key/value pairs of headers to be sent with the request
 * queryParams - (optional) An object as key/value pairs to be added to query as query params
 * noStore - (optional) If true, make the request but do not store in redux. Can be used with take & friends for side effects
 * period - (optional) How often to re-fetch when used in a recurring fetch scenario
 * taskId - (optional) A pre-generated (by your application) id to be used to cancel a recurring task at a later time
 * 
 */
type FetchAction = {
	modelName: string,
	headers?: Object,
	queryParams?: Object,
	noStore?: boolean,
	period?: number,
	taskId?: string
}

type LoggerFunction = string => void
type TokenAccessFunction = void => ?OAuthToken
type ErrorFunction = void => void

let logger: LoggerFunction
let models: Object
let tokenAccessFunction: TokenAccessFunction
let errorFunction: ErrorFunction

/**
 * Construct a request based on the provided action, make a request with a configurable retry,
 * and handle errors, logging and dispatching all steps.
 * 
 * @param {FetchAction} action - An action with the request configuration
 */
function* fetchData(action: FetchAction) {
	// Validate
	if (!action || !action.modelName) {
		throw new Error("'modelName' config parameter is required for fetchData")
	}

	// Get fetch parameters from global fetch dictionary using the modelName passed in to locate them
	// Combine parameters from global dictionary with any passed in - locals override dictionary
	const baseConfig = _.get(models, action.modelName)

	if (!baseConfig) {
		throw new Error(`Cannot find \'${action.modelName}\' model in model dictionary`)
	}
	const headers = Object.assign({}, baseConfig.headers, action.headers)
	const fetchConfig = Object.assign({}, baseConfig, {
		headers: headers
	})
	if (action.body || baseConfig.body) {
		// If the body is a string, we are assuming it's an application/x-www-form-urlencoded
		if (typeof action.body === 'string') {
			fetchConfig.body = action.body
		} else {
			fetchConfig.body = Object.assign({}, baseConfig.body, action.body)
		}
	}
	fetchConfig.queryParams = Object.assign({}, baseConfig.queryParams, action.queryParams)

	// substitute parameterized query path references with values from store
	// TODO: validate the path exists in the store
	if (/{{.+}}/.test(fetchConfig.path)) {
		// have to get reference to the whole store here
		// since there is no yield in an arrow fn
		const store = yield select(state => state)
		fetchConfig.path = fetchConfig.path.replace(/{{(.+?)}}/, (matches, backref) => {
			return _.get(store, backref)
		})
	}

	// Configure retry
	const tryLimit = action.noRetry ? 0 : 4
	let tryCount = 0
	let didFail
	let didTimeOut
	let lastError: string = ''

	// Run retry loop
	do {
		didFail = false
		didTimeOut = false

		tryCount++
		// Indicate fetch action has begun
		yield put(
			createAction(action.noStore ? actions.TRANSIENT_FETCH_REQUESTED : actions.FETCH_REQUESTED, {
				modelName: action.modelName
			})
		)
		try {
			const oauthToken = tokenAccessFunction()
			if (oauthToken && oauthToken.access_token) {
				fetchConfig.headers['Authorization'] = `Bearer ${oauthToken.access_token}`
			}
			const { fetchResult, timedOut } = yield race({
				fetchResult: call(doFetch, fetchConfig),
				timedOut: call(delay, action.timeLimit ? action.timeLimit : 3000)
			})
			if (fetchResult && !(fetchResult.title && fetchResult.title === 'Error')) {
				yield put(
					createAction(
						action.noStore
							? actions.TRANSIENT_FETCH_RESULT_RECEIVED
							: actions.FETCH_RESULT_RECEIVED,
						{
							data: fetchResult,
							modelName: action.modelName
						}
					)
				)
			} else {
				if (timedOut) {
					yield put(
						createAction(actions.FETCH_TIMED_OUT, {
							modelName: action.modelName
						})
					)
					didTimeOut = true
					throw new Error()
				} else {
					yield put(
						createAction(actions.FETCH_TRY_FAILED, {
							modelName: action.modelName,
							errorData: fetchResult
						})
					)
					throw new Error()
				}
			}
		} catch (error) {
			// HERE I THINK WE'D PERFORM THE PASSED FUNCTION FOR HANDLING ERRORS
			if (errorFunction) {
				errorFunction()
			}
			didFail = true
			lastError = error
			logger('fetchData fail')
			logger(error)
			yield call(delay, 2 ^ (tryCount * 100)) // 100, 200, 400...
		}
	} while (tryCount < tryLimit && didFail)

	// Handle retry failure
	if (tryCount === tryLimit && didFail) {
		if (!didTimeOut) {
			yield put(createAction(actions.FETCH_FAILED, { modelName: action.modelName }))
		}
		logger('fetchData retry fail')
		logger(lastError)
	}
}

/**
 * Call the fetchData saga exactly one time (keeping in mind fetchData has retries by default)
 * 
 * @param {FetchAction} action - An action with the request configuration
 */
function* fetchOnce(action: FetchAction) {
	yield call(fetchData, action)
}

/**
 * The loop saga that makes the request every {config.period} milliseconds until
 * cancelled
 * 
 * @param {FetchAction} action - An action with the request configuration
 */
function* fetchDataLoop(action: FetchAction) {
	try {
		while (true) {
			yield call(fetchData, action)
			yield call(delay, action.period)
		}
	} finally {
		if (yield cancelled()) {
			yield put(
				createAction(actions.PERIODIC_TERMINATION_SUCCEEDED, { modelName: action.modelName })
			)
		}
	}
}

function matchesTerminationAction(incomingAction, fetchAction) {
	return (
		incomingAction.type === actions.PERIODIC_TERMINATION_REQUESTED &&
		incomingAction.taskId === fetchAction.taskId
	)
}

/**
 * Call the fetchData saga every {config.period} milliseconds. This saga requires the 'period' and 'taskId' properties
 * on the action parameter.
 * 
 * @param {FetchAction} action - An action with the request configuration 
 */
function* fetchDataRecurring(action: FetchAction) {
	if (!action || !action.period) {
		throw new Error("'period' config parameter is required for fetchDataRecurring")
	}
	if (!action || !action.taskId) {
		throw new Error("'taskId' config parameter is required for fetchDataRecurring")
	}
	const bgSyncTask = yield fork(fetchDataLoop, action)
	yield take(incomingAction => matchesTerminationAction(incomingAction, action))
	yield cancel(bgSyncTask)
}

/**
 * A default logger function that logs to the console. Used if no other logger is provided
 * 
 * @param {string} message - The message to log
 */
const consoleLogger = (message: string) => {
	console.debug(message)
}

const tokenAccess = () => {
	return undefined
}

/**
 * The main saga for fetching data. Must be initialized with an object representing the models that can be fetched
 * and an API root to prepend to any partial URLs specified in the models object. A logger should normally be provided
 * as well.
 * 
 * Models object require a form as follows (with optional nested models):
 * {
 * 	fryModel: {
 * 		path: '/api/Foo'
 * 	},
 * 	groupOfModels: {
 * 		leelaModel: {
 * 			path: '/api/Bar'
 * 		},
 * 		benderModel: {
 * 			path: '/api/Baz'
 * 		}
 * 	}
 * }
 * 
 * Models are referenced in the actions.DATA_REQUESTED action by path, i.e.
 * { type: actions.DATA_REQUESTED, { modelName: 'fryModel' } }
 * -- or --
 * { type: actions.DATA_REQUESTED, { modelName: 'groupOfModels.leelaModel' } }
 * 
 * @export
 * @param {Object} modelsParam - An object indicating the APIs available in a application with which to make requests
 * @param {string} apiRootParam - A url to which partial URLs are appended (i.e.) 'https://myapp.com'
 * @param {LoggerFunction} [loggerParam=consoleLogger] - A function that accepts a string and logs it real good
 */
export default function* fetchSaga(
	modelsParam: Object,
	apiRootParam: string,
	tokenAccessParam: TokenAccessFunction = tokenAccess,
	errorParam: ErrorAccessFunction = errorFunction,
	loggerParam: LoggerFunction = consoleLogger
): Generator<*, *, *> {
	if (!modelsParam) {
		throw new Error("'modelsParam' is required for fetchSaga")
	}
	setApiRoot(apiRootParam)
	logger = loggerParam
	logger(`logger set to ${logger.name}`)
	models = modelsParam
	errorFunction = errorParam
	tokenAccessFunction = tokenAccessParam

	yield takeEvery(actions.DATA_REQUESTED, fetchOnce)
	yield takeEvery(actions.PERIODIC_DATA_REQUESTED, fetchDataRecurring)
	yield takeLatest(actions.DATA_REQUESTED_USE_LATEST, fetchOnce)
}
