import { merge } from 'lodash'
import { Action } from 'redux'

enum NET_ACTION {
	// App-level request
	DATA_REQUESTED = 'application/DATA_REQUESTED',
	PERIODIC_DATA_REQUESTED = 'application/PERIODIC_DATA_REQUESTED',
	PERIODIC_TERMINATION_REQUESTED = 'application/PERIODIC_TERMINATION_REQUESTED',
	DATA_REQUESTED_USE_LATEST = 'application/DATA_REQUESTED_USE_LATEST',

	// System responses
	PERIODIC_TERMINATION_SUCCEEDED = 'sagas/PERIODIC_TERMINATION_SUCCEEDED',

	// System requests for fetching/updating
	FETCH_REQUESTED = 'net/FETCH_REQUESTED',
	TRANSIENT_FETCH_REQUESTED = 'net/TRANSIENT_FETCH_REQUESTED',
	KEY_REMOVAL_REQUESTED = 'net/KEY_REMOVAL_REQUESTED',

	// System responses to fetch requests
	FETCH_RESULT_RECEIVED = 'net/FETCH_RESULT_RECEIVED',
	FETCH_FAILED = 'net/FETCH_FAILED',
	TRANSIENT_FETCH_RESULT_RECEIVED = 'net/TRANSIENT_FETCH_RESULT_RECEIVED',
	TRANSIENT_FETCH_FAILED = 'net/TRANSIENT_FETCH_FAILED',
	TRY_FETCH_FAILED = 'net/TRY_FETCH_FAILED'
}

export function createAction(type: string, payload: any): Action {
	return merge({}, { type }, payload)
}

export default NET_ACTION
