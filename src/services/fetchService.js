// @flow

import { call } from 'redux-saga/effects'

type FetchConfig = {
	queryParams: Object,
	path: string,
	method: string,
	headers: Object,
	body: Object
}

let apiRoot: string

/**
 * Add query params to path. Prepend with apiRoot if necessary
 * 
 * @param {FetchConfig} config - The fetch configuration containing the path and query params
 * @returns A string with query params populated and prepended
 */
function constructPath(config: FetchConfig) {
	let queryParams
	if (config.queryParams) {
		queryParams = Object.keys(config.queryParams)
			.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(config.queryParams[key])}`)
			.join('&')
	}

	let path = config.path.startsWith('http') ? config.path : `${apiRoot}${config.path}`
	if (queryParams) {
		path = `${path}?${queryParams}`
	}
	return path
}

/**
 * A function to receieve and store the apiRoot for prepending to subsequent partial URLs in paths
 * 
 * @export
 * @param {string} uri - The uri to save and prepend later
 */
export function setApiRoot(uri: string) {
	apiRoot = uri
}

/**
 * The function that actually sends the HTTP request and returns the response, handling errors.
 * Requests default to using GET method. Content-Type defaults to 'application/json'. Body is sent
 * as stringified JSON unless the 'application/x-www-form-urlencoded' Content-Type is detected, in which case
 * it's sent as provided
 * TODO: provide logging injection
 * 
 * @export
 * @param {FetchConfig} config - The configuration used to construct a fetch request
 * @returns {Object?} - The response, parsed as JSON
 */
export function* doFetch(config: FetchConfig): Generator<*, *, *> {
	if (!config.path) {
		throw new Error("'config.path' is required for fetchService")
	}

	const method = config.method || 'GET'
	const headers = Object.assign(
		{},
		{
			'Content-Type': 'application/json; charset=utf-8'
		},
		config.headers
	)
	const body = headers['Content-Type'].includes('application/x-www-form-urlencoded')
		? config.body
		: JSON.stringify(config.body)
	try {
		const response = yield call(fetch, constructPath(config), {
			method: method,
			headers: headers,
			body
		})
		return response ? yield call(() => response.json()) : yield call(() => null)
	} catch (error) {
		throw error
	}
}
