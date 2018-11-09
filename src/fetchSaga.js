// @flow

import { delay } from 'redux-saga'
import {
	call,
	cancel,
	cancelled,
	fork,
	put,
	select,
	take,
	takeEvery,
	takeLatest
} from 'redux-saga/effects'
import _ from 'lodash'
import uuid from 'uuid'
import { doFetch, setApiRoot } from './services/fetchService'
import actions, { createAction } from './actions'
import type { OAuthToken, FetchAction, FetchError } from './types'

//#region Types

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
 * Prepare fetchConfig to pass to fetchService. Also set up state
 * to handle response correctly.
 *
 * @param {Object} model - The model selected from the models object
 * @param {FetchAction} action - The action dispatched by the client
 * @param {Object} models - The entire models object, passed in for testability
 */
function prepareFetch(model, action, models) {
	const modelConfig = _.merge({}, model._config)
	const fetchConfig = _.merge({}, modelConfig.fetch, {
		headers: _.merge({}, action.headers),
		queryParams: _.merge({}, action.queryParams)
	})

	// set "method" if defined
	if (action.method && typeof action.method === 'string') {
		fetchConfig.method = action.method
	}

	// set or merge "body"
	// If the body is a string, we are assuming it's an application/x-www-form-urlencoded
	if (!!action.body && (typeof action.body === 'string' || action.body instanceof FormData)) {
		fetchConfig.body = action.body
		fetchConfig.contentType = 'application/x-www-form-urlencoded'
	} else if (!!fetchConfig.body || !!action.body) {
		const isBodyArray =
			(fetchConfig.body && _.isArray(fetchConfig.body)) || (action.body && _.isArray(action.body))
		fetchConfig.body = isBodyArray
			? _.union([], fetchConfig.body, action.body)
			: _.merge({}, fetchConfig.body, action.body)
	}

	// set "contentType" if defined, overriding the default application/x-www-form-urlencoded
	// that may have been set previously
	if (action.contentType && typeof action.contentType === 'string') {
		fetchConfig.contentType = action.contentType
	}

	let modelName: string = action.modelName
	let isCollectionItemFetch: boolean = false
	let isCollectionItemCreate: boolean = false
	let isUrlValid: boolean = true
	// copy pathParams into two arrays, to manage them separately
	let pathParams = _.merge([], action.pathParams)
	let modelNameParams = _.merge([], action.pathParams)

	// find all the model levels from modelName
	const modelNameLevels = modelName.split('.')
	let lastModelLevel = models
	const modelLevels = modelNameLevels.map(levelName => {
		const modelLevel = _.get(lastModelLevel, levelName)
		lastModelLevel = modelLevel
		return modelLevel
	})

	// find the levels that are collections
	const collectionModelLevels = modelLevels.filter(
		level => level._config && level._config.isCollection
	)
	const isAnyLevelCollection = collectionModelLevels.length > 0

	// if any level is a collection, we need to concat their fetch paths and modelNames
	if (isAnyLevelCollection) {
		if (modelNameLevels.length > 1) {
			modelLevels.forEach((modelLevel, index) => {
				const levelName = modelNameLevels[index]
				const currentModelConfig = _.merge({}, modelLevel._config)
				const currentFetchConfig = _.merge({}, currentModelConfig.fetch)
				const currentPath = !_.isUndefined(currentFetchConfig.path)
					? currentFetchConfig.path
					: index === 0
						? `/api/${levelName}`
						: levelName

				// first level, just use its values
				if (index === 0) {
					fetchConfig.path = currentPath
					modelName = levelName
					return
				}

				// if previous level isCollection, we need to use "{:id}" hooks when appending new level
				// otherwise, just append using the divider
				const prevModelConfig = _.merge({}, modelLevels[index - 1]._config)
				const divider = fetchConfig.path.length > 0 && currentPath.length > 0 ? '/' : ''
				if (prevModelConfig.isCollection) {
					fetchConfig.path = `${fetchConfig.path}${divider}{:id}/${currentPath}`
					modelName = `${modelName}.{:id}.${levelName}`
				} else {
					fetchConfig.path = `${fetchConfig.path}${divider}${currentPath}`
					modelName = `${modelName}.${levelName}`
				}

				// an absolute path resets the fetch path, and ignores previous pathParams moving forward
				// it does not affect modelName params for redux
				if (currentPath.indexOf('/') === 0) {
					fetchConfig.path = currentPath
					const collectionLevelIndex = collectionModelLevels.indexOf(modelLevel)
					if (collectionLevelIndex > 0) {
						pathParams = pathParams.slice(collectionLevelIndex, pathParams.length)
					}
				}
			})
		} else if (!fetchConfig.path) {
			fetchConfig.path = `/api/${modelName}`
		}

		// determine if we need to append an "{:id}" hook
		const pathLevels = (fetchConfig.path.match(/{:id}/g) || []).length
		// GET, PUT, PATCH, DELETE => append '/{:id}'
		isCollectionItemFetch = !!modelConfig.isCollection && pathParams.length > pathLevels
		// POST
		isCollectionItemCreate = !!modelConfig.isCollection && fetchConfig.method === 'POST'

		// insert pathParam hooks into path and modelName
		// track collection item requests by id (update, delete) or guid (create)
		if (isCollectionItemFetch && !isCollectionItemCreate) {
			fetchConfig.path = `${fetchConfig.path}/{:id}`
			modelName = `${modelName}.{:id}`
		} else if (isCollectionItemCreate) {
			modelName = `${modelName}.${action.guid || uuid.v4()}`
		}
	}

	// substitute any params in path, e.g. /api/group/{:id}
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

	// substitute any params in modelName, e.g. groups.{:id}
	if (/{:.+}/.test(modelName)) {
		let index = 0
		modelName = modelName.replace(/{:(.+?)}/g, (matches, backref) => {
			const value = modelNameParams[index]
			if (value === undefined || value === null) {
				isUrlValid = false
			}
			index++
			return value
		})
	}

	return {
		fetchConfig,
		modelConfig,
		modelName,
		isCollectionItemFetch,
		isCollectionItemCreate,
		isUrlValid
	}
}

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

	const result = prepareFetch(model, action, models)
	const { fetchConfig, modelConfig } = result
	let { modelName, isCollectionItemFetch, isCollectionItemCreate, isUrlValid } = result

	// TODO: Figure out how to move this into prepareFetch() without causing the
	// carefully constructed tower of yield()s in the tests from crashing down
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
				guid: action.guid,
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
				modelName,
				guid: action.guid
			})
		)
		try {
			const oauthToken = yield call(tokenAccessFunction, action.modelName)
			if (oauthToken && oauthToken.access_token) {
				fetchConfig.headers['Authorization'] = `Bearer ${oauthToken.access_token}`
			}
			const fetchResult = yield call(doFetch, fetchConfig)
			if (fetchResult && fetchResult.ok) {
				let storeAction = action.noStore
					? actions.TRANSIENT_FETCH_RESULT_RECEIVED
					: actions.FETCH_RESULT_RECEIVED
				let data = fetchResult.data
				if (modelConfig.isCollection) {
					if (fetchConfig.method === 'DELETE') {
						storeAction = actions.KEY_REMOVAL_REQUESTED
						data = {}
					} else if (isCollectionItemFetch || isCollectionItemCreate) {
						data = fetchResult.data
					} else {
						const fetchedAt = new Date()
						// convert to a key-value collection
						// handles arrays or objects
						// set item metadata
						data = Object.keys(fetchResult.data).reduce((out, key) => {
							const item = fetchResult.data[key]
							out[item.id] = _.merge({}, item, {
								_metadata: {
									isFetching: false,
									hasError: false,
									fetchedAt
								}
							})
							return out
						}, {})
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
							modelName: `${modelNameLevels.join('.')}.${data.id}`,
							guid: action.guid,
							data
						})
					)
					// remove temp item under guid key
					yield put(createAction(actions.KEY_REMOVAL_REQUESTED, { modelName }))
				} else {
					yield put(
						createAction(storeAction, {
							modelName,
							guid: action.guid,
							data
						})
					)
				}
			} else {
				lastFetchError = {
					modelName,
					errorData: _.merge({}, !!fetchResult && !!fetchResult.data ? fetchResult.data : {})
				}
				throw new Error(JSON.stringify(lastFetchError))
			}
		} catch (error) {
			let errorData = !!lastFetchError ? lastFetchError.errorData : null

			yield put(
				createAction(
					actions.TRY_FETCH_FAILED,
					_.merge({ modelName, guid: action.guid }, lastFetchError)
				)
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
				_.merge(
					{
						modelName,
						guid: action.guid
					},
					lastFetchError
				)
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
