import { call } from 'redux-saga/effects'

let apiRoot

export function setApiRoot(uri) {
	apiRoot = uri
}

function constructPath(config) {
	let queryParams;
	if (config.queryParams) {
		queryParams = Object.keys(config.queryParams).map(key =>
			`${encodeURIComponent(key)}=${encodeURIComponent(config.queryParams[key])}`
		).join('&')
	}

	let path = config.path.startsWith('http') ? config.path : `${apiRoot}${config.path}`
	if (queryParams){
		path = `${path}?${queryParams}`
	}
	return path
}

export function* doFetch(config) {
	if (!config.path) {
		throw new Error('\'config.path\' is required for fetchService')
	}

	const method = config.method || 'GET'
	const headers = Object.assign({}, {
		'Content-Type': 'application/json; charset=utf-8'
	}, config.headers)
	const body = headers['Content-Type'].includes('application/x-www-form-urlencoded') ?
		config.body :
		JSON.stringify(config.body)
	try {
		const response = yield call(fetch, constructPath(config), {
			method: method,
			headers: headers,
			body
		})
		return response ? yield call(() => response.json()) : {}
	} catch (error) {
		throw error
	}
}