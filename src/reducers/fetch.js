import actions from '../actions'

export default function fetchReducer(state = {}, action) {
	switch (action.type) {
		case actions.FETCH_DATA:
			return Object.assign({}, state, {
				
			})

		case actions.FETCH_DATA_RECURRING:
			return Object.assign({}, state, {
				
			})

		default:
			return state
	}
}