[![Coverage Status](https://coveralls.io/repos/github/purdue-tlt/studiokit-net-js/badge.svg?branch=master)](https://coveralls.io/github/purdue-tlt/studiokit-net-js?branch=master)

# StudioKit Net Library

A library for declarative, configurable data (API) access with built-in retry, timeout, periodic refresh, and concurrency handling.

1. [Installation](#installation)
1. [Usage](#usage)
1. [API](#api)
1. [Development](#development)

For *in-vivo* examples of how to use this library, see the [example react app](https://github.com/purdue-tlt/example-react-app-js) and the [example react native app](https://github.com/purdue-tlt/example-react-native-app)

# Installation

## Install this library and redux-saga as a dependency
1. `yarn add studiokit-net`
1. `yarn add redux-saga` (which depends on `redux` itself)
1. Create a `reducers.js` module that includes the reducer from this library, i.e.
	```js
	import { combineReducers } from 'redux'
	import { reducers as netReducers } from 'studiokit-net-js'

	export default combineReducers({
		models: netReducers.fetchReducer
	})
	```
1. Create an `apis.js` module specifying any apis you will call in your application, i.e.
	```js
	const apis = {
		publicData: {
			path: 'https://httpbin.org/get',
			queryParams: {
				foo: 'bar'
			}
		}
	}

	export default apis
	```
1. Create a `rootSaga.js` module that includes the fetchSaga from this library, i.e.
	```js
	import { all } from 'redux-saga/effects'
	import { sagas as netSagas } from 'studiokit-net-js'
	import apis from '../../apis'

	export default function* rootSaga() {
		yield all({
			fetchSaga: netSagas.fetchSaga(
				apis,
				'https://yourapp.com'
			)
		})
	}
	```
1. Wire up your store in your app (perhaps in `index.js`) with the above, i.e.
	```js
	import createSagaMiddleware from 'redux-saga'
	import { createStore, applyMiddleware } from 'redux'
	import reducer from './redux/reducers'
	import rootSaga from './redux/sagas/rootSaga'

	const sagaMiddleware = createSagaMiddleware()
	const store = createStore(
		reducer,
		applyMiddleware(sagaMiddleware)
	)
	sagaMiddleware.run(rootSaga)

	```

# Usage
Once you have the above steps completed, you can dispatch actions to the store and the data will be fetched and populated in the redux store, i.e.

```js
import { dispatchAction } from '../services/actionService'
import { actions as netActions } from 'studiokit-net-js'
.
.
.
store.dispatch({ type: netActions.DATA_REQUESTED, modelName: 'publicData' })
```
Once the data is fetched, it will live in the redux store at the models.publicData key, i.e.
```js
models: {
	publicData: {
		isFetching: false,
		hasError: false,
		timedOut: false,
		data: { foo: 'bar', baz: ['quux', 'fluux']},
		fetchedAt: "2017-05-23T20:38:11.103Z"
	}
}
```

# API
Actions are dispatched using the following keys in the action object for configuring the request
```ts
type FetchAction = {
	modelName: string,
	headers?: Object,
	queryParams?: Object,
	noStore?: boolean,
	period?: number,
	taskId?: string,
	noRetry?: boolean,
	timeLimit: number
}
```

- `modelName` refers to the path to the fetch configuration key found in `apis.js`
- `headers` is an optional object used as key/value pairs to populate the request headers
- `queryParams` is an optional object used as key/value pairs to populate the query parameters
- `noStore` is an optional boolean that, if true, indicates the request should be made without storing the response in the redux store
- `period` is an optional number of milliseconds after which a request should repeat when dispatching a recurring fetch
- `taskId` is a string that must be passed to a recurring fetch for future cancellation
- `noRetry` will prevent the use of the default logarithmic backoff retry strategy
- `timeLimit` is an optional number that will specify the timeout for a single attempt at a request. Defaults to 3000ms

The following actions can be dispatched
- `DATA_REQUESTED`: This will fetch the data specified at the `modelName` key of the action
- `PERIODIC_DATA_REQUESTED`: This will fetch the data specified at the `modelName` key at an interval specified by the `period` key in the action. This also requires you to generate and pass a `taskId` key for subsequent cancellation
- `PERIODIC_TERMINATION_REQUESTED`: This will cause the periodic fetch identified by `taskId` to be cancelled
- `DATA_REQUESTED_USE_LATEST`: This will fetch data specified at the `modelName` key, using only the latest result in time if multiple requests are dispatched at the same time (i.e. others are started with the same `modelName` before some are completed)

## Examples

Given the following `apis.js`
```js
{
	basicData: {
		path: 'https://httpbin.org/get'
	},
	futurama: {
		path: 'https://www.planetexpress.com/api/goodNewsEveryone',
		queryParams: {
			doctor: 'zoidberg'
		}
	},
	theOffice: {
		path: 'https://dundermifflin.com/api/paper'
		headers: {
			'Content-Type': 'x-beet-farmer'
		}
	},
	aGrouping: {
		apiOne: {
			path: '/api/one'
		},
		apiTwo: {
			path: '/api/two/{{models.futurama.data.zoidberg}}'
		}
	},
	basicPost: {
		path: '/api/createSomeThing'
		method: 'POST'
	},
	basicPostTwo: {
		path: '/api/createSomeKnownThing'
		method: 'POST',
		body: { person: 'Fry' }
	}
}
```
You can make the following types of requests:  
[Basic Fetch](#basic-fetch)  
[Nested Model](#nested-model)  
[Add Headers](#add-headers)  
[Add Query Params](#add-query-params)  
[Periodic Fetch](#periodic-fetch)  
[Cancel Periodic Fetch](#cancel-periodic-fetch)  
[No Store](#no-store)  
[Post](#post)

#

### Basic fetch:

*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'basicData'
})
```
*request generated* 
```http
GET https://httpbin.org/get
``` 
*resulting redux*
```js
{
	models: {
		basicData: {
			isFetching: false,
			hasError: false,
			timedOut: false,
			data: {...}
			fetchedAt: '2017-05-23T20:38:11.103Z'
		}
	}
}
```

#

### Nested model:

*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'aGrouping.apiOne'
})
```
*request generated* 
```http
GET https://myapp.com/api/one
``` 
*resulting redux*
```js
{
	models: {
		aGrouping: {
			apiOne: {
				isFetching: false,
				hasError: false,
				timedOut: false,
				data: {...}
				fetchedAt: '2017-05-23T20:38:11.103Z'
			}
		}
	}
}
```

#

### Add headers:

*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'basicData',
	headers: {'Accept-Charset': 'utf-8'}
})
```
*request generated*
```http
Accept-Charset: utf-8
GET https://httpbin.org/get
```
*resulting redux*

Same as basic fetch above, with possibly different data, depending on response relative to additional header

**Note**: Headers specified in the action will be merged with headers specified in `apis.js` with the headers in the action taking precedence

#

### Add query params:

*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'basicData',
	queryParams: {robot: 'bender'}
})
```
*request generated*
```http
GET https://httpbin.org/get?robot=bender
```
*resulting redux*

Same as basic fetch above, with possibly different data, depending on response relative to new query params

**Note**: Query parameters specified in the action will be merged with query parameters specified in `apis.js` with the query params in the action taking precedence

#

### Periodic fetch:
*dispatch*
```js
store.dispatch({
	type: netActions.PERIODIC_DATA_REQUESTED,
	modelName: 'basicData',
	period: 1000,
	taskId: 'something-random'
})
```
*request generated*
```http
GET https://httpbin.org/get
```
*resulting redux*

Same as basic fetch above, but refreshing every 1000ms, replacing the `data` key in redux with new data and updating the `fetchedAt` key

#

### Cancel periodic fetch:
*dispatch*
```js
store.dispatch({
	type: netActions.PERIODIC_TERMINATION_REQUESTED,
	modelName: 'basicData',
	taskId: 'something-random'
})
```
*request generated*

None

*resulting redux*

Same as basic fetch above with `data` and `fetchedAt` reflecting the most recent fetch before the cancellation request

#

### No store:
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'basicData',
	noStore: true
})
```
*request generated*
```http
GET https://httpbin.org/get
```
*resulting redux*

No change to the redux store. Your application can create its own sagas and use `take` and friends in `redux-saga`, however, to watch for responses and cause side-effects

#

### Post:
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'basicPost',
	body: {
		ruleOne: "Don't talk about Fight Club",
		ruleTwo: "Don't talk about Fight Club"
	}
})
```
*request generated*
```http
Content-Type: application/json
POST https://myapp.com/api/createSomeThing
{ruleOne: "Don't talk about Fight Club",ruleTwo: "Don't talk about Fight Club"}
```
*resulting redux*

Same as basic fetch above, with the `data` key containing the response data from the `POST` request

#

## Development

During development of this library, you can clone this project and use

`yarn link`

to make the module available to another project's `node_modules` on the same computer without having to publish to a repo and pull to the other project. In the other folder, you can use

`yarn link studiokit-net-js`

to add `studiokit-foo-js` to the consuming project's `node_modules`

### Build

Because this is a module, the source has to be transpiled to ES5 since the consuming project won't transpile anything in `node_modules`

`yarn build`

will transpile everything in `/src` to `/lib`. `/lib/index.js` is the entry point indicated in `package.json`

During development, you can run

`yarn build:watch`

and babel will rebuild the `/lib` folder when any file in `/src` changes.

When you commit, a commit hook will automatically regenerate `/lib`

### Deploy

This packaged is deployed via the npm repository. Until we add commit hooks for deployment, it must be published via `yarn publish`
