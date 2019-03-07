import {
	call,
	cancel,
	cancelled,
	fork,
	put,
	select,
	take,
	takeEvery,
	takeLatest,
	delay
} from 'redux-saga/effects'
import _ from 'lodash'
import uuid from 'uuid'
import { doFetch, setApiRoot } from './fetchService'
import NET_ACTION, { createAction } from './actions'
import {
	OAuthToken,
	FetchAction,
	FetchError,
	EndpointMappings,
	EndpointMapping,
	Dictionary,
	EndpointConfig
} from './types'
import { SagaIterator } from '@redux-saga/core'

//#region Types

type LoggerFunction = (message: any) => void
type TokenAccessFunction = (action: any) => OAuthToken | undefined
type ErrorFunction = (error: string) => void

//#endregion Types

//#region Helpers

export const getState = (state?: any) => state

export const matchesTerminationAction = (incomingAction: any, fetchAction: any) => {
	return (
		incomingAction.type === NET_ACTION.PERIODIC_TERMINATION_REQUESTED &&
		incomingAction.taskId === fetchAction.taskId
	)
}

export const takeMatchesTerminationAction = (action: any) => (incomingAction: any) =>
	matchesTerminationAction(incomingAction, action)

/* istanbul ignore next */
export const defaultTokenAccessFunction: TokenAccessFunction = () => {
	return undefined
}

/* istanbul ignore next */
export const defaultErrorFunction: ErrorFunction = () => {
	return
}

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
let endpointMappings: EndpointMappings
let tokenAccessFunction: TokenAccessFunction
let errorFunction: ErrorFunction

//#endregion Local Variables

/**
 * Prepare fetchConfig to pass to fetchService. Also set up state
 * to handle response correctly.
 *
 * @param {EndpointMapping} endpointMapping The model selected from the models object
 * @param {FetchAction} action The action dispatched by the client
 * @param {EndpointMappings} endpointMappingsParam The EndpointMappings object, passed in for testability
 */
export function prepareFetch(
	endpointMapping: EndpointMapping,
	action: FetchAction,
	endpointMappingsParam: EndpointMappings
) {
	const endpointConfig = _.merge({}, endpointMapping._config)
	const fetchConfig = _.merge({}, endpointConfig.fetch, {
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
			(fetchConfig.body && _.isArray(fetchConfig.body)) ||
			(action.body && _.isArray(action.body))
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
	const modelNameParams = _.merge([], action.pathParams)

	// find all the model levels from modelName
	const modelNameLevels = modelName.split('.')
	let lastModelLevel: EndpointMapping | EndpointConfig = endpointMappingsParam
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
				const divider =
					!!fetchConfig.path && fetchConfig.path.length > 0 && currentPath.length > 0
						? '/'
						: ''
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
		}

		if (!fetchConfig.path) {
			fetchConfig.path = `/api/${modelName}`
		}

		// determine if we need to append an "{:id}" hook
		const pathLevels = (fetchConfig.path.match(/{:id}/g) || []).length
		// GET, PUT, PATCH, DELETE => append '/{:id}'
		isCollectionItemFetch = !!endpointConfig.isCollection && pathParams.length > pathLevels
		// POST
		isCollectionItemCreate = !!endpointConfig.isCollection && fetchConfig.method === 'POST'

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
	if (!!fetchConfig.path && /{:.+}/.test(fetchConfig.path)) {
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
		endpointConfig,
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
 * @param {FetchAction} action An action with the request configuration
 */
export function* fetchData(action: FetchAction) {
	// Validate
	if (!action || !action.modelName) {
		throw new Error("'modelName' config parameter is required for fetchData")
	}

	// Get fetch parameters from global fetch dictionary using the modelName passed in to locate them
	// Combine parameters from global dictionary with any passed in - locals override dictionary
	const endpointMapping = _.get(endpointMappings, action.modelName)
	if (!endpointMapping) {
		throw new Error(`Cannot find \'${action.modelName}\' in EndpointMappings`)
	}

	const result = prepareFetch(endpointMapping, action, endpointMappings)
	const { fetchConfig, endpointConfig: modelConfig } = result
	const { modelName, isCollectionItemFetch, isCollectionItemCreate } = result
	let { isUrlValid } = result

	// TODO: Figure out how to move this into prepareFetch() without causing the
	// carefully constructed tower of yield()s in the tests from crashing down
	// substitute any path parameters from the redux store, e.g. '{{apiRoot}}/groups'
	if (!!fetchConfig.path && /{{.+}}/.test(fetchConfig.path)) {
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
			createAction(
				action.noStore ? NET_ACTION.TRANSIENT_FETCH_FAILED : NET_ACTION.FETCH_FAILED,
				{
					modelName: action.modelName,
					guid: action.guid,
					errorData: 'Invalid URL'
				}
			)
		)
		return
	}

	// Configure retry
	const tryLimit: number = action.noRetry ? 1 : 4
	let tryCount: number = 0
	let didFail: boolean = false
	let lastFetchError: FetchError | undefined
	let lastError: Error | undefined
	// Run retry loop
	do {
		didFail = false
		tryCount++
		// Indicate fetch action has begun
		yield put(
			createAction(
				action.noStore ? NET_ACTION.TRANSIENT_FETCH_REQUESTED : NET_ACTION.FETCH_REQUESTED,
				{
					modelName,
					guid: action.guid
				}
			)
		)
		try {
			const oauthToken = yield call(tokenAccessFunction, action.modelName)
			if (oauthToken && oauthToken.access_token) {
				fetchConfig.headers.Authorization = `Bearer ${oauthToken.access_token}`
			}
			const fetchResult = yield call(doFetch, fetchConfig)
			if (fetchResult && fetchResult.ok) {
				let storeAction = action.noStore
					? NET_ACTION.TRANSIENT_FETCH_RESULT_RECEIVED
					: NET_ACTION.FETCH_RESULT_RECEIVED
				let data = fetchResult.data
				if (modelConfig.isCollection) {
					if (fetchConfig.method === 'DELETE') {
						storeAction = NET_ACTION.KEY_REMOVAL_REQUESTED
						data = {}
					} else if (isCollectionItemFetch || isCollectionItemCreate) {
						data = fetchResult.data
					} else {
						const fetchedAt = new Date()
						// convert to a key-value collection
						// handles arrays or objects
						// set item metadata
						data = Object.keys(fetchResult.data).reduce((out: Dictionary<any>, key) => {
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
					const resultAction = createAction(storeAction, {
						modelName: `${modelNameLevels.join('.')}.${data.id}`,
						guid: action.guid,
						data
					})
					yield put(resultAction)
					// remove temp item under guid key
					yield put(createAction(NET_ACTION.KEY_REMOVAL_REQUESTED, { modelName }))
				} else {
					const resultReceivedAction = createAction(storeAction, {
						modelName,
						guid: action.guid,
						data
					})
					yield put(resultReceivedAction)
				}
			} else {
				lastFetchError = {
					modelName,
					errorData: _.merge(
						{},
						!!fetchResult && !!fetchResult.data ? fetchResult.data : {}
					)
				}
				throw new Error(JSON.stringify(lastFetchError))
			}
		} catch (error) {
			const errorData = !!lastFetchError ? lastFetchError.errorData : null

			yield put(
				createAction(
					NET_ACTION.TRY_FETCH_FAILED,
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
			yield delay(2 ^ (tryCount * 100)) // 100, 200, 400...
		}
	} while (tryCount < tryLimit && didFail)

	// Handle retry failure
	if (tryCount === tryLimit && didFail) {
		yield put(
			createAction(
				action.noStore ? NET_ACTION.TRANSIENT_FETCH_FAILED : NET_ACTION.FETCH_FAILED,
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
 * @param {FetchAction} action An action with the request configuration
 */
export function* fetchOnce(action: FetchAction) {
	yield call(fetchData, action)
}

/**
 * The loop saga that makes the request every {action.period} milliseconds until
 * cancelled
 *
 * @param {FetchAction} action An action with the request configuration
 */
export function* fetchDataLoop(action: FetchAction) {
	if (_.isNil(action.period)) {
		throw new Error('`action.period` is required')
	}
	try {
		do {
			yield call(fetchData, action)
			yield delay(action.period)
		} while (true)
	} catch (error) {
		errorFunction(error.message)
		logger('fetchDataLoop fail')
		logger(error)
	} finally {
		if (yield cancelled()) {
			yield put(
				createAction(NET_ACTION.PERIODIC_TERMINATION_SUCCEEDED, {
					modelName: action.modelName
				})
			)
		}
	}
}

/**
 * Call the fetchData saga every {action.period} milliseconds. This saga requires the 'period' and 'taskId' properties
 * on the action parameter.
 *
 * @param {FetchAction} action An action with the request configuration
 */
export function* fetchDataRecurring(action: FetchAction) {
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
 * The main saga for fetching data. Must be initialized with an EndpointMappings object that can be fetched
 * and an API root to prepend to any partial URLs specified in the models object. A logger should normally be provided
 * as well.
 *
 * EndpointMappings object require a form as follows (with optional nested models):
 * ```
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
 * ```
 * Models are referenced in the actions.DATA_REQUESTED action by path, i.e.
 * `{ type: actions.DATA_REQUESTED, { modelName: 'fryModel' } }`
 * -- or --
 * `{ type: actions.DATA_REQUESTED, { modelName: 'groupOfModels.leelaModel' } }`
 *
 * @export
 * @param {EndpointMappings} endpointMappingsParam An mapping of API endpoints available in the application
 * @param {string | undefined} apiRootParam A url to which partial URLs are appended (i.e.) 'https://myapp.com'
 * @param {TokenAccessFunction} [tokenAccessParam=defaultTokenAccessFunction] function that returns
 * an optional OAuth token
 * @param {ErrorFunction} [errorParam=defaultErrorFunction] A function to perform on errors
 * @param {LoggerFunction} [loggerParam=defaultLogger] A function that accepts a string and logs it real good
 */
export default function* fetchSaga(
	endpointMappingsParam: EndpointMappings,
	apiRootParam?: string,
	tokenAccessFunctionParam: TokenAccessFunction | undefined = defaultTokenAccessFunction,
	errorFunctionParam: ErrorFunction | undefined = defaultErrorFunction,
	loggerParam: LoggerFunction | undefined = defaultLogger
): SagaIterator {
	/* istanbul ignore if */
	if (!endpointMappingsParam) {
		throw new Error("'modelsParam' is required for fetchSaga")
	}
	setApiRoot(apiRootParam)
	logger = loggerParam
	logger(`logger set to ${logger.name}`)
	endpointMappings = endpointMappingsParam
	errorFunction = errorFunctionParam
	tokenAccessFunction = tokenAccessFunctionParam

	yield takeEvery(NET_ACTION.DATA_REQUESTED, fetchOnce)
	yield takeEvery(NET_ACTION.PERIODIC_DATA_REQUESTED, fetchDataRecurring)
	yield takeLatest(NET_ACTION.DATA_REQUESTED_USE_LATEST, fetchOnce)
}
