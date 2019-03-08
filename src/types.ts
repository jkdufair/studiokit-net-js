import { Action } from 'redux'
import { NET_ACTION } from './actions'

/**
 * Key-value pairs.
 *
 * @template T the type of the values.
 */
export interface Dictionary<T> {
	[key: string]: T
}

/**
 * OAuth token as generated by OWIN.NET.
 */
export interface OAuthToken {
	access_token: string
	refresh_token: string
	token_type: string
	expires_in: number
	client_id: string
	'.issued': string
	'.expires': string
}

/**
 * Fetch related error for an API response.
 */
export interface FetchError {
	modelName: string
	errorData: any
}

/**
 * Fetch related data about an API response.
 */
export interface Metadata {
	isFetching: boolean
	hasError: boolean
	lastFetchError?: FetchError
	fetchedAt?: Date
}

/**
 * Represents an API response that will be stored in redux.
 *
 * @template T enforce a type on all properties that are defined and not `Metadata`. Default is `any`.
 */
export interface Model<T = any> extends Dictionary<T | Metadata | undefined | null> {
	_metadata?: Metadata
}

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

/**
 * Configuration for a fetch request.
 * Used by EndpointConfig to define defaults for a specific endpoint.
 */
export interface FetchConfig {
	path?: string
	method?: HTTPMethod
	headers?: Dictionary<string>
	body?: any
	contentType?: string
	queryParams?: Dictionary<string>
	routeParams?: Dictionary<string>
}

/**
 * Configuration for a single model endpoint mapping.
 */
export interface EndpointConfig {
	isCollection?: boolean
	fetch?: FetchConfig
}

/**
 * A single model endpoint mapping. Allows for nested mappings.
 */
export interface EndpointMapping extends Dictionary<EndpointMapping | EndpointConfig | undefined> {
	_config?: EndpointConfig
}

/**
 * A mapping of models to endpoints, where each key is a *modelName*.
 * Represents the nested structure in which models will be stored in redux.
 */
export interface EndpointMappings extends Dictionary<EndpointMapping> {}

/**
 * A redux action which is related to a fetch request, result, or error.
 */
export interface FetchAction extends Action<NET_ACTION> {
	/** The key that is used to locate an {EndpointMapping} and also to place the result in the redux store. */
	modelName: string
	/** A pre-generated GUID, from your application, that will be attached to the `fetchResult.data`. */
	guid?: string
	/** The HTTP Method to use for the fetch. Defaults to use value from EndpointMapping, or 'GET'. */
	method?: HTTPMethod
	/** Key/value pairs of headers to be sent with the request. */
	headers?: Dictionary<string>
	/** Key/value pairs to be added to query as query params. */
	queryParams?: Dictionary<string>
	/**
	 * An array of values to be replaced in the fetch path using pattern matching, in order, e.g.
	 * `"/collection/{}/subcollection/{}" => "/collection/1/subcollection/2"`
	 */
	pathParams?: Array<string | number | undefined | null>
	/** A value to send as the HTTP Body. */
	body?: any
	/** If true, make the request but do not store the response in redux. */
	noStore?: boolean
	/** How often in `ms` milliseconds to re-fetch when used in a recurring fetch scenario. */
	period?: number
	/** An id, from your application, to be used to cancel a recurring task at a later time. */
	taskId?: string
	/** Prevent the use of the default logarithmic backoff retry strategy. */
	noRetry?: boolean
	/** The contentType to be set in the headers. Defaults to `application/json` */
	contentType?: string
	/** The data returned from a request. */
	data?: any
	/** The error data returned from a failed request. */
	errorData?: any
}
