// @flow

import { call } from 'redux-saga/effects'
import _ from 'lodash'

type FetchConfig = {
	queryParams: Object,
	routeParams: Object,
	path: string,
	method: string,
	headers: Object,
	body: Object,
	contentType: string
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

	let path = _.startsWith(config.path, 'http') ? config.path : `${apiRoot}${config.path}`
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

export function getApiRoot() {
	return apiRoot
}

/**
 * The function that actually sends the HTTP request and returns the response, handling errors.
 * Requests default to using GET method. Content-Type defaults to 'application/json'. Body is sent
 * as stringified JSON unless the 'application/x-www-form-urlencoded' Content-Type is detected, in which case
 * it's sent as provided. If it is a 'multipart/form-data', we are assuming that the data is being sent as a FormData, and
 * we do not set the Content-type (https://stackoverflow.com/questions/39280438/fetch-missing-boundary-in-multipart-form-data-post).
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

	const headers =
		// setting FormData as the body will set "Content-Type", including "boundary"
		// do not interfere
		config.contentType === 'multipart/form-data'
			? _.merge({}, config.headers)
			: _.merge(
					{},
					{
						'Content-Type': !!config.contentType
							? config.contentType
							: 'application/json; charset=utf-8'
					},
					config.headers
			  )

	const isBodyJson =
		headers['Content-Type'] && _.includes(headers['Content-Type'], 'application/json')
	const body = !isBodyJson ? config.body : JSON.stringify(config.body)
	const response = yield call(fetch, constructPath(config), {
		method: method,
		headers: headers,
		body
	})
	if (!response) {
		return undefined
	}

	// construct a subset of the response object to return
	const result = {
		ok: response.ok,
		status: response.status,
		data: undefined
	}

	// If the request was a 204, use the body (if any) that was PUT in the request as the "response"
	// so it gets incorporated correctly into Redux
	// 200/201 should return a representation of the entity.
	// (https://tools.ietf.org/html/rfc7231#section-6.3.1)

	const isResponseJson =
		!!response.headers &&
		response.headers.has('Content-Type') &&
		_.includes(response.headers.get('Content-Type'), 'application/json')

	if (response.status === 204) {
		result.data = isBodyJson ? config.body : undefined
	} else {
		result.data = isResponseJson
			? yield call(() => response.json())
			: yield call(() => response.text())
	}

	if (!response.ok) {
		// note: error responses are expected to be JSON
		result.data = _.merge(
			{},
			{
				title: 'Error',
				message: response.statusText,
				code: response.status
			},
			result.data
		)
	}

	return result
}
