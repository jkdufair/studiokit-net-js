import actions from './actions'
import fetchReducer from './fetchReducer'
import fetchSaga from './fetchSaga'
import noStoreSaga, { registerNoStoreActionHook, unregisterNoStoreActionHook } from './noStoreSaga'

const reducers = { fetchReducer }
const sagas = { fetchSaga, noStoreSaga }
const hooks = { registerNoStoreActionHook, unregisterNoStoreActionHook }
export { actions, reducers, sagas, hooks }
