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
import uuid from 'uuid'
import { doFetch, setApiRoot } from './services/fetchService'
import actions, { createAction } from './actions'

//#region Types

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
 * method - (optional) The HTTP Method to use for the fetch. Otherwise will use the method set in apis.js, or 'GET'
 * headers - (optional) An object as key/value pairs of headers to be sent with the request
 * queryParams - (optional) An object as key/value pairs to be added to query as query params
 * pathParams - (optional) An array of values to be replaced in the fetch path using pattern matching, in order, "/collection/{}/subcollection/{}" => "/collection/1/subcollection/2"
 * noStore - (optional) If true, make the request but do not store in redux. Can be used with take & friends for side effects
 * period - (optional) How often to re-fetch when used in a recurring fetch scenario
 * taskId - (optional) A pre-generated (by your application) id to be used to cancel a recurring task at a later time
 * noRetry - (optional)  will prevent the use of the default logarithmic backoff retry strategy
 * timeLimit - (optional) number that will specify the timeout for a single attempt at a request. Defaults to 3000ms
 * guid - (optional) A pre-generated (by your application) GUID that will be attached to the fetchResult.data, to be stored in redux and used to match
 */
type FetchAction = {
	modelName: string,
	method?: string,
	headers?: Object,
	queryParams?: Object,
	pathParams?: Array<string>,
	noStore?: boolean,
	period?: number,
	taskId?: string,
	noRetry?: boolean,
	timeLimit?: number,
	guid?: string
}

type FetchError = {
	modelName: string,
	errorData: Object
}

type LoggerFunction = string => void
type TokenAccessFunction = void => ?OAuthToken
type ErrorFunction = string => void

//#endregion Types

//#region Helpers

const getState = state => state

const matchesTerminationAction = (incomingAction, fetchAction) => {
	return (
		incomingAction.type === actions.PERIODIC_TERMINATION_REQUESTED &&
		incomingAction.taskId === fetchAction.taskId
	)
}

const takeMatchesTerminationAction = action => incomingAction =>
	matchesTerminationAction(incomingAction, action)

const defaultTokenAccessFunction: TokenAccessFunction = () => {
	return undefined
}

const defaultErrorFunction: ErrorFunction = (message: string) => {}

/**
 * A default logger function that logs to the console. Used if no other logger is provided
 * 
 * @param {string} message - The message to log
 */
const defaultLogger: LoggerFunction = (message: string) => {
	console.debug(message)
}

//#endregion Helpers

//#region Local Variables

let logger: LoggerFunction
let models: Object
let tokenAccessFunction: TokenAccessFunction
let errorFunction: ErrorFunction

//#endregion Shared Variables

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
	const model = _.get(models, action.modelName)
	if (!model) {
		throw new Error(`Cannot find \'${action.modelName}\' model in model dictionary`)
	}

	const modelConfig = Object.assign({}, model._config)
	const fetchConfig = Object.assign({}, modelConfig.fetch, {
		headers: Object.assign({}, action.headers),
		queryParams: Object.assign({}, action.queryParams)
	})

	// set "method" if defined
	if (action.method && typeof action.method === 'string') {
		fetchConfig.method = action.method
	}

	// set or merge "body"
	if (action.body || fetchConfig.body) {
		// If the body is a string, we are assuming it's an application/x-www-form-urlencoded
		if (typeof action.body === 'string') {
			fetchConfig.body = action.body
		} else {
			fetchConfig.body = Object.assign({}, fetchConfig.body, action.body)
		}
	}

	let modelName: string = action.modelName
	let isCollectionItemFetch: boolean = false
	let isCollectionItemCreate: boolean = false
	let isUrlValid: boolean = true
	const pathParams = action.pathParams || []

	// collection "fetchConfig.path" and "modelName"
	if (modelConfig.isCollection) {
		// construct modelName and path
		const modelNameLevels = modelName.split('.')
		if (modelNameLevels.length > 1) {
			let lastModelLevel = models
			modelNameLevels.forEach((levelName, index) => {
				const currentModelLevel = _.get(lastModelLevel, levelName)
				const currentModelConfig = Object.assign({}, currentModelLevel._config)
				const currentFetchConfig = Object.assign({}, currentModelConfig.fetch)
				if (index === 0) {
					fetchConfig.path = currentFetchConfig.path || `/api/${levelName}`
					modelName = levelName
					lastModelLevel = currentModelLevel
					return
				}
				fetchConfig.path = `${fetchConfig.path}/{:id}/${currentFetchConfig.path || levelName}`
				modelName = `${modelName}.data.{:id}.${levelName}`
				lastModelLevel = currentModelLevel
			})
		} else if (!fetchConfig.path) {
			fetchConfig.path = `/api/${modelName}`
		}

		// determine if we need to add pathParam hooks
		const pathLevels = (fetchConfig.path.match(/{:.+}/g) || []).length

		// GET, PUT, PATCH, DELETE => append '/{:id}'
		isCollectionItemFetch = pathParams.length > pathLevels
		// POST
		isCollectionItemCreate = fetchConfig.method === 'POST'

		// insert pathParam hooks into path and modelName
		// track collection item requests by id (update, delete) or guid (create)
		if (isCollectionItemFetch && !isCollectionItemCreate) {
			fetchConfig.path = `${fetchConfig.path}/{:id}`
			modelName = `${modelName}.data.{:id}`
		} else if (isCollectionItemCreate) {
			modelName = `${modelName}.data.${action.guid || uuid.v4()}`
		}
	}

	// substitute any pathParams in path, e.g. /api/group/{:id}
	if (/{:.+}/.test(fetchConfig.path)) {
		let index = 0
		fetchConfig.path = fetchConfig.path.replace(/{:(.+?)}/g, (matches, backref) => {
			const value = pathParams[index]
			if (value === undefined || value === null) {
				isUrlValid = false
			}
			index++
			return value
		})
	}

	// substitute any pathParams in modelName, e.g. groups.data.{:id}
	if (/{:.+}/.test(modelName)) {
		let index = 0
		modelName = modelName.replace(/{:(.+?)}/g, (matches, backref) => {
			const value = pathParams[index]
			if (value === undefined || value === null) {
				isUrlValid = false
			}
			index++
			return value
		})
	}

	// substitute any path parameters from the redux store, e.g. '{{apiRoot}}/groups'
	if (/{{.+}}/.test(fetchConfig.path)) {
		// have to get reference to the whole store here
		// since there is no yield in an arrow fn
		const store = yield select(getState)
		fetchConfig.path = fetchConfig.path.replace(/{{(.+?)}}/, (matches, backref) => {
			const value = _.get(store, backref)
			if (value === undefined || value === null) {
				isUrlValid = false
			}
			return value
		})
	}

	if (!isUrlValid) {
		yield put(
			createAction(action.noStore ? actions.TRANSIENT_FETCH_FAILED : actions.FETCH_FAILED, {
				modelName: action.modelName,
				errorData: 'Invalid URL'
			})
		)
		return
	}

	// Configure retry
	const tryLimit: number = action.noRetry ? 1 : 4
	let tryCount: number = 0
	let didFail: boolean = false
	let lastFetchError: ?FetchError
	let lastError: ?Error

	// Run retry loop
	do {
		didFail = false
		tryCount++
		// Indicate fetch action has begun
		yield put(
			createAction(action.noStore ? actions.TRANSIENT_FETCH_REQUESTED : actions.FETCH_REQUESTED, {
				modelName
			})
		)
		try {
			const oauthToken = yield call(tokenAccessFunction, action.modelName)
			if (oauthToken && oauthToken.access_token) {
				fetchConfig.headers['Authorization'] = `Bearer ${oauthToken.access_token}`
			}
			const { fetchResult, timedOutResult } = yield race({
				fetchResult: call(doFetch, fetchConfig),
				timedOutResult: call(delay, action.timeLimit ? action.timeLimit : 30000)
			})
			if (fetchResult && !(fetchResult.title && fetchResult.title === 'Error')) {
				let storeAction = action.noStore
					? actions.TRANSIENT_FETCH_RESULT_RECEIVED
					: actions.FETCH_RESULT_RECEIVED
				let data = fetchResult

				if (modelConfig.isCollection) {
					data = {}
					if (fetchConfig.method === 'DELETE') {
						storeAction = actions.KEY_REMOVAL_REQUESTED
					} else if (isCollectionItemFetch || isCollectionItemCreate) {
						data = fetchResult
					} else {
						const fetchedAt = new Date()
						const resultsArray = !_.isArray(fetchResult)
							? Object.keys(fetchResult).map(key => fetchResult[key])
							: fetchResult
						resultsArray.forEach(item => {
							data[item.id] = {
								data: item,
								isFetching: false,
								hasError: false,
								timedOut: false,
								fetchedAt
							}
						})
					}
				}

				// attach guid to result
				if (action.guid && _.isPlainObject(data)) {
					data.guid = action.guid
				}

				// POST new collection item
				if (isCollectionItemCreate) {
					const modelNameLevels = modelName.split('.')
					// remove guid
					modelNameLevels.pop()
					// add by new result's id
					yield put(
						createAction(storeAction, {
							data,
							modelName: `${modelNameLevels.join('.')}.${data.id}`
						})
					)
					// remove temp item under guid key
					yield put(createAction(actions.KEY_REMOVAL_REQUESTED, { modelName }))
				} else {
					yield put(
						createAction(storeAction, {
							data,
							modelName
						})
					)
				}
			} else {
				// combine fetchResult with didTimeOut
				lastFetchError = {
					modelName,
					errorData: Object.assign(
						{
							didTimeOut: !!timedOutResult
						},
						fetchResult
					)
				}
				throw new Error(JSON.stringify(lastFetchError))
			}
		} catch (error) {
			let errorData = lastFetchError ? lastFetchError.errorData : null

			yield put(
				createAction(actions.TRY_FETCH_FAILED, Object.assign({ modelName }, lastFetchError))
			)

			// Don't do anything with 401 errors
			// And some errors don't have fetch results associated with them
			if (errorData && errorData.code ? errorData.code !== 401 : true) {
				errorFunction(error.message)
			}
			logger('fetchData fail')
			logger(error)

			didFail = true
			lastError = error
			yield call(delay, 2 ^ (tryCount * 100)) // 100, 200, 400...
		}
	} while (tryCount < tryLimit && didFail)

	// Handle retry failure
	if (tryCount === tryLimit && didFail) {
		yield put(
			createAction(
				action.noStore ? actions.TRANSIENT_FETCH_FAILED : actions.FETCH_FAILED,
				Object.assign({ modelName }, lastFetchError)
			)
		)
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
	} catch (error) {
		errorFunction(error.message)
		logger('fetchDataLoop fail')
		logger(error)
	} finally {
		if (yield cancelled()) {
			yield put(
				createAction(actions.PERIODIC_TERMINATION_SUCCEEDED, { modelName: action.modelName })
			)
		}
	}
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
	yield take(takeMatchesTerminationAction(action))
	yield cancel(bgSyncTask)
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
 * @param {TokenAccessFunction} [tokenAccessParam=defaultTokenAccessFunction] - function that returns an optional OAuth token
 * @param {ErrorFunction} [errorParam=defaultErrorFunction]  - A function to perform on errors
 * @param {LoggerFunction} [loggerParam=defaultLogger] - A function that accepts a string and logs it real good
 */
export default function* fetchSaga(
	modelsParam: Object,
	apiRootParam: string,
	tokenAccessFunctionParam: TokenAccessFunction = defaultTokenAccessFunction,
	errorFunctionParam: ErrorFunction = defaultErrorFunction,
	loggerParam: LoggerFunction = defaultLogger
): Generator<*, *, *> {
	if (!modelsParam) {
		throw new Error("'modelsParam' is required for fetchSaga")
	}
	setApiRoot(apiRootParam)
	logger = loggerParam
	logger(`logger set to ${logger.name}`)
	models = modelsParam
	errorFunction = errorFunctionParam
	tokenAccessFunction = tokenAccessFunctionParam

	yield takeEvery(actions.DATA_REQUESTED, fetchOnce)
	yield takeEvery(actions.PERIODIC_DATA_REQUESTED, fetchDataRecurring)
	yield takeLatest(actions.DATA_REQUESTED_USE_LATEST, fetchOnce)
}
