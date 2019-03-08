import NET_ACTION from './actions'
export { NET_ACTION }
// deprecated, backwards compatible export
export { NET_ACTION as actions }

export * from './types'

import fetchReducer from './fetchReducer'
import fetchSaga from './fetchSaga'
import noStoreSaga, { registerNoStoreActionHook, unregisterNoStoreActionHook } from './noStoreSaga'
const reducers = { fetchReducer }
const sagas = { fetchSaga, noStoreSaga }
const hooks = { registerNoStoreActionHook, unregisterNoStoreActionHook }
export { reducers, sagas, hooks }
