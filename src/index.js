// @flow
import actions from './actions'
import fetchReducer from './fetchReducer'
import fetchSaga from './fetchSaga'

const reducers = { fetchReducer }
const sagas = { fetchSaga }
export { actions, reducers, sagas }
