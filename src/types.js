// @flow

/**
 * Oauth token as generated by OWIN.NET.
 */
export type OAuthToken = {
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
 * guid - (optional) A pre-generated (by your application) GUID that will be attached to the fetchResult.data, to be stored in redux and used to match
 * contentType - (optional) the contentType to be set in the header. If not set, the default value is `application/json`
 */
export type FetchAction = {
	modelName: string,
	method?: string,
	headers?: Object,
	queryParams?: Object,
	pathParams?: Array<string>,
	noStore?: boolean,
	period?: number,
	taskId?: string,
	noRetry?: boolean,
	guid?: string,
	contentType?: string
}

export type FetchError = {
	modelName: string,
	errorData: Object
}
