import actions from '../actions'

export default function fetchReducer(state = {}, action) {
	switch (action.type) {
		case actions.FETCH_REQUEST:
			return Object.assign({}, state, {
				[`${action.modelName}`]: {
					isFetching: true,
					hasError: false
				}
			})
		case actions.FETCH_RESULT:
			return Object.assign({}, state, {
				[`${action.modelName}`]: {
					data: action.data,
					isFetching: false,
					hasError: false,
					fetchedAt: new Date()
				}
			})
		case actions.FETCH_FAIL:
			return Object.assign({}, state, {
				[`${action.modelName}`]: {
					isFetching: false,
					hasError: true
				}
			})

		default:
			return state
	}
}