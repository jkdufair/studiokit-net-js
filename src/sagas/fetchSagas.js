 import { delay } from 'redux-saga'
 import { call, cancel, fork, put, take, takeEvery, takeLatest } from 'redux-saga/effects'
 import { doFetch, setApiRoot } from '../services'
 import actions, { createAction } from '../actions'

 let logger, models

 function* fetchData(action) {
 	// Validate
 	if (!action.modelName) {
 		throw new Error('\'modelName\' config parameter is required for fetchData')
 	}

 	// Configure retry
 	const tryLimit = action.noRetry ? 0 : 4;
 	let tryCount = 0
 	let didFail
 	let lastError

 	// Run retry loop
 	do {
 		didFail = false;
 		tryCount++
 		try {
			// Indicate fetch action has begun
 			yield put(createAction(action.noStore ? actions.FETCH_REQUEST_TRANSIENT : actions.FETCH_REQUEST, { modelName: action.modelName }))

			// Get fetch parameters from global fetch dictionary using the modelName passed in to locate them
			// Combine parameters from global dictionary with any passed in - locals override dictionary
 			const baseConfig = models[action.modelName];
 			// Avoiding pulling in a lib to do deep copy here. Hand crafted. Locally owned.
 			// If body is string, pass it directly (to handle content-type: x-www-form-urlencoded)
 			const headers = Object.assign({}, baseConfig.headers, action.headers)
 			const fetchConfig = Object.assign({}, baseConfig, {
 				headers: headers
 			})
 			if (action.body || baseConfig.body) {
 				fetchConfig.body = Object.assign({}, baseConfig.body, action.body)
 			}
 			const result = yield call(doFetch, fetchConfig)
 			yield put(createAction(action.noStore ? actions.FETCH_RESULT_TRANSIENT : actions.FETCH_RESULT, { data: result, modelName: action.modelName }))
 		} catch (error) {
 			yield put(createAction(action.noStore ? actions.FETCH_FAIL_TRANSIENT : actions.FETCH_FAIL, { model: action.modelName }))
 			didFail = true
 			lastError = error
 			logger.log('fetchData fail')
 			logger.log(error)
 			yield call(delay, 2 ^ tryCount * 100) // 100, 200, 400...
 		}
 	} while (tryCount < tryLimit && didFail)

 	// Handle retry failure
	if (tryCount === tryLimit && didFail) {
 		yield put(createAction(actions.FETCH_RETRY_FAIL, { model: action.modelName }))
 		logger.log('fetchData retry fail')
 		logger.log(lastError)
 	}
 }

 function* fetchOnce(config) {
 	yield call(fetchData, config)
 }

 function* fetchDataLoop(config) {
 	try {
 		while (true) {
 			yield call(fetchData, config)
 			yield call(delay, config.period)
 		}
 	} finally {
 		put(actions.FETCH_DATA_CANCELLED)
 	}
 }

 function* fetchDataRecurring(config) {
 	if (!config.period) {
 		throw new Error('\'period\' config parameter is required for fetchDataRecurring')
 	}
 	if (!config.taskId) {
 		throw new Error('\'taskId\' config parameter is required for fetchDataRecurring')
 	}
 	const bgSyncTask = yield fork(fetchDataLoop, config)
 	yield take(action => action.type === actions.FETCH_DATA_CANCEL && action.taskId === config.taskId)
 	yield cancel(bgSyncTask)
 }

 function* fetchLatest(config) {
 	yield call(fetchData, config)
 }

 export function* fetch(modelsParam, apiRootParam, loggerParam = { log: (error) => { console.log(error) } }) {
 	if (!modelsParam) {
 		throw new Error('\'modelsParam\' is required for fetchSaga')
 	}
 	setApiRoot(apiRootParam)
 	logger = loggerParam
 	models = modelsParam

 	yield takeEvery(actions.FETCH_DATA, fetchOnce)
 	yield takeEvery(actions.FETCH_DATA_RECURRING, fetchDataRecurring)
 	yield takeLatest(actions.FETCH_DATA_LATEST, fetchLatest)
 }