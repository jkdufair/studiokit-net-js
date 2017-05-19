// @flow

import { delay } from 'redux-saga'
import {
	call,
	cancel,
	fork,
	put,
	race,
	take,
	takeEvery,
	takeLatest
} from 'redux-saga/effects'
import { doFetch, setApiRoot } from './services/fetchService'
import actions, { createAction } from './actions'
import byString from './utilities'

type OAuthToken = {
	access_token: string
}

type FetchAction = {
	modelName: string,
	headers?: Object,
	queryParams?: Object,
	noStore?: boolean
}

type TokenSuccessAction = {
	oauthToken: OAuthToken
}

let logger, models: Object
let oauthToken: OAuthToken

function* fetchData(action: FetchAction) {
	// Validate
	if (!action.modelName) {
		throw new Error("'modelName' config parameter is required for fetchData")
	}

	// Configure retry
	const tryLimit = action.noRetry ? 0 : 4
	let tryCount = 0
	let didFail
	let lastError: string = ''

	// Run retry loop
	do {
		didFail = false
		tryCount++
		try {
			// Indicate fetch action has begun
			yield put(
				createAction(
					action.noStore
						? actions.TRANSIENT_FETCH_REQUESTED
						: actions.FETCH_REQUESTED,
					{ modelName: action.modelName }
				)
			)

			// Get fetch parameters from global fetch dictionary using the modelName passed in to locate them
			// Combine parameters from global dictionary with any passed in - locals override dictionary
			const baseConfig = byString(models, action.modelName)

			if (!baseConfig) {
				throw new Error(
					`Cannot find \'${action.modelName}\' model in model dictionary`
				)
			}
			// Avoiding pulling in a lib to do deep copy here. Hand crafted. Locally owned.
			// If body is string, pass it directly (to handle content-type: x-www-form-urlencoded)
			let authHeaders = {}
			if (oauthToken) {
				authHeaders['Authorization'] = `Bearer ${oauthToken.access_token}`
			}
			const headers = Object.assign(
				{},
				baseConfig.headers,
				action.headers,
				authHeaders
			)
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
			fetchConfig.queryParams = Object.assign(
				{},
				baseConfig.queryParams,
				action.queryParams
			)
			const { fetchResult, timedOut } = yield race({
				fetchResult: call(doFetch, fetchConfig),
				timedOut: call(delay, action.timeLimit ? action.timeLimit : 3000)
			})
			if (
				fetchResult &&
				!(fetchResult.title && fetchResult.title === 'Error')
			) {
				yield put(
					createAction(
						action.noStore
							? actions.TRANSIENT_FETCH_RESULT_RECEIVED
							: actions.FETCH_RESULT_RECEIVED,
						{ data: fetchResult, modelName: action.modelName }
					)
				)
			} else {
				if (timedOut) {
					yield put(
						createAction(actions.FETCH_TIMED_OUT, {
							modelName: action.modelName
						})
					)
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
			didFail = true
			lastError = error
			logger.log('fetchData fail')
			logger.log(error)
			yield call(delay, 2 ^ (tryCount * 100)) // 100, 200, 400...
		}
	} while (tryCount < tryLimit && didFail)

	// Handle retry failure
	if (tryCount === tryLimit && didFail) {
		yield put(
			createAction(actions.FETCH_FAILED, { modelName: action.modelName })
		)
		logger.log('fetchData retry fail')
		logger.log(lastError)
	}
}

function* fetchOnce(action: FetchAction) {
	yield call(fetchData, action)
}

function* fetchDataLoop(config) {
	try {
		while (true) {
			yield call(fetchData, config)
			yield call(delay, config.period)
		}
	} finally {
		put(actions.PERIODIC_TERMINATION_SUCCEEDED)
	}
}

function* fetchDataRecurring(config) {
	if (!config.period) {
		throw new Error(
			"'period' config parameter is required for fetchDataRecurring"
		)
	}
	if (!config.taskId) {
		throw new Error(
			"'taskId' config parameter is required for fetchDataRecurring"
		)
	}
	const bgSyncTask = yield fork(fetchDataLoop, config)
	yield take(
		action =>
			action.type === actions.PERIODIC_TERMINATION_REQUESTED &&
			action.taskId === config.taskId
	)
	yield cancel(bgSyncTask)
}

function* fetchLatest(config) {
	yield call(fetchData, config)
}

function* interceptOauthToken(action: TokenSuccessAction) {
	oauthToken = action.oauthToken
}

const consoleLogger = {
	log: (error: string) => {
		console.log(error)
	}
}

export default function* fetchSaga(
	modelsParam: Object,
	apiRootParam: string,
	loggerParam: { log: (error: string) => void } = consoleLogger
): Generator<*, *, *> {
	if (!modelsParam) {
		throw new Error("'modelsParam' is required for fetchSaga")
	}
	setApiRoot(apiRootParam)
	logger = loggerParam
	models = modelsParam

	yield takeEvery(actions.DATA_REQUESTED, fetchOnce)
	yield takeEvery(actions.PERIODIC_DATA_REQUESTED, fetchDataRecurring)
	yield takeLatest(actions.DATA_REQUESTED_USE_LATEST, fetchLatest)
	// Hard coded so as not to take a dependency on another module for an action name
	// Sorry, refactoring friend
	yield takeLatest('auth/GET_TOKEN_SUCCEEDED', interceptOauthToken)
	yield takeLatest('auth/TOKEN_REFRESH_SUCCEEDED', interceptOauthToken)
}
