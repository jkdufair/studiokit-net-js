import { call } from 'redux-saga/effects'

export function* fetchService(config) {
	const path = config.path || '/'
	const method = config.method || 'GET'
	const headers = config.headers
	const body = config.body
	try {
		const response = yield call(fetch, path, {
			method: method,
			headers: headers,
			body: JSON.stringify(body)
		})
		return response ? yield call(() => response.json()) : {}
	} catch (error) {
		//TODO: log this
	}
}