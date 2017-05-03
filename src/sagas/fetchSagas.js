import { delay } from 'redux-saga'
import { call, cancel, fork, put, take, takeEvery, takeLatest } from 'redux-saga/effects'
import { fetchService } from '../services'
import actions, { createAction } from '../actions'

function* fetchData(config) {
	if (!config.postFetchAction) {
		throw new Error('\'postFetchAction\' config parameter is required for fetchData')
	}
	try {
		const result = yield call(fetchService, config)
		yield put(createAction(config.postFetchAction, { data: result }))
	} catch (error) {
		// TODO: log me
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

export function* fetchSaga() {
	yield takeEvery(actions.FETCH_DATA, fetchOnce)
	yield takeEvery(actions.FETCH_DATA_RECURRING, fetchDataRecurring)
	yield takeLatest(actions.FETCH_DATA_LATEST, fetchLatest)
}