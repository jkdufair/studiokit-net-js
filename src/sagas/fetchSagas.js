import { delay } from 'redux-saga'
import { call, cancel, fork, put, take, takeEvery, takeLatest } from 'redux-saga/effects'
import { doFetch, setApiRoot } from '../services'
import actions, { createAction } from '../actions'

let logger, models

function* fetchData(config) {
	if (!config.modelName) {
		throw new Error('\'modelName\' config parameter is required for fetchData')
	}
	const tryLimit = config.noRetry ? 0 : 4;
	let tryCount = 0
	let didFail
	let lastError
	do {
		didFail = false;
		tryCount++
		try {
			yield put(createAction(actions.FETCH_REQUEST, { modelName: config.modelName }))
			const baseConfig = models[config.modelName];
			// Avoiding pulling in a lib to do deep copy here. Hand crafted. Locally owned.
			// If body is string, pass it directly (to handle content-type: x-www-form-urlencoded)
			const headers = Object.assign({}, baseConfig.headers, config.headers)
			const fetchConfig = Object.assign({}, baseConfig, {
				headers: headers,
				body: headers['Content-Type'] && headers['Content-Type'].includes('application/x-www-form-urlencoded') ?
					config.body :
					Object.assign({}, baseConfig.body, config.body)
			})
			const result = yield call(doFetch, fetchConfig)
			yield put(createAction(actions.STORE_FETCH_RESULT, { data: result, modelName: config.modelName }))
		} catch (error) {
			yield put(createAction(actions.FETCH_FAIL, { model: config.modelName }))
			didFail = true
			lastError = error
			logger.log('fetchData fail')
			logger.log(error)
			yield call(delay, 2 ^ tryCount * 100) // 100, 200, 400...
		}
	} while (tryCount < tryLimit && didFail)

	if (tryCount === tryLimit && didFail) {
		yield put(createAction(actions.FETCH_RETRY_FAIL, { model: config.modelName }))
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
	if (!config.id) {
		throw new Error('\'id\' config parameter is required for fetchDataRecurring')
	}
	const bgSyncTask = yield fork(fetchDataLoop, config)
	yield take(action => action.type === actions.FETCH_DATA_CANCEL && action.id === config.id)
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