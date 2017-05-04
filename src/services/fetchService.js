import { call } from 'redux-saga/effects'

let apiRoot

export function setApiRoot(uri) {
	apiRoot = uri
}

export function* doFetch(config) {
	if (!config.path) {
		throw new Error('\'config.path\' is required for fetchService')
	}

	const path = config.path.startsWith('http') ? config.path : `${apiRoot}${config.path}`
	const method = config.method || 'GET'
	const headers = Object.assign({}, {
		'Content-Type': 'application/json; charset=utf-8'
	}, config.headers)
	const body = headers['Content-Type'].includes('application/x-www-form-urlencoded') ?
		config.body :
		JSON.stringify(config.body)
	try {
		const response = yield call(fetch, path, {
			method: method,
			headers: headers,
			body
		})
		return response ? yield call(() => response.json()) : {}
	} catch (error) {
		//TODO: log this
		throw error
	}
}