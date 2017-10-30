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
1. `yarn add studiokit-net-js`
1. `yarn add redux-saga` (which depends on `redux` itself)
1. Create a `reducers.js` module that includes the reducer from this library, i.e.
	```js
	import { combineReducers } from 'redux'
	import { reducers as netReducers } from 'studiokit-net-js'

	export default combineReducers({
		models: netReducers.fetchReducer
	})
	```
1. Create an `apis.js` module specifying any apis you will call in your application. All configuration properties are set under `_config`. Fetch request specific default properties are set on `_config.fetch`, i.e.
	```js
	const apis = {
		publicData: {
			_config: {
				fetch: {
					path: 'https://httpbin.org/get',
					queryParams: {
						foo: 'bar'
					}
				}
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
		data: { foo: 'bar', baz: ['quux', 'fluux']},
		isFetching: false,
		hasError: false,
		timedOut: false,
		fetchedAt: "2017-05-23T20:38:11.103Z"
	}
}
```

# API
Actions are dispatched using the following keys in the action object for configuring the request
```ts
type FetchAction = {
	modelName: string,
	method?: string,
	headers?: Object,
	queryParams?: Object,
	pathParams?: Object,
	noStore?: boolean,
	period?: number,
	taskId?: string,
	noRetry?: boolean,
	timeLimit?: number,
	guid?: string
}
```

- `modelName` refers to the path to the fetch configuration key found in `apis.js`
- `method` is an optional string used as the HTTP Method for the fetch. Otherwise will use the method set in `apis.js`, or `'GET'`
- `headers` is an optional object used as key/value pairs to populate the request headers
- `queryParams` is an optional object used as key/value pairs to populate the query parameters
- `pathParams` is an optional array of values to be replaced in the fetch path using pattern matching, in order, e.g. `[1, 2]` and `/collection/{:id}/subcollection/{:id}` => `/collection/1/subcollection/2`
- `noStore` is an optional boolean that, if true, indicates the request should be made without storing the response in the redux store
- `period` is an optional number of milliseconds after which a request should repeat when dispatching a recurring fetch
- `taskId` is a string that must be passed to a recurring fetch for future cancellation
- `noRetry` will prevent the use of the default logarithmic backoff retry strategy
- `timeLimit` is an optional number that will specify the timeout for a single attempt at a request. Defaults to 3000ms
- `guid` is an optional pre-generated (by your application) GUID that will be attached to a fetch result's data, to be stored in redux and used to match request results in components

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
		_config: {
			fetch: {
				path: 'https://httpbin.org/get'
			}
		}
	},
	futurama: {
		_config: {
			fetch: {
				path: 'https://www.planetexpress.com/api/goodNewsEveryone',
				queryParams: {
					doctor: 'zoidberg'
				}
			}
		}
	},
	theWalkers: {
		_config: {
			fetch: {
				path: 'https://thewalkingdead/api/walker/{:walkerId}',
				pathParams: {
					walkerId: 1
				}
			}
		}
	}.
	theOffice: {
		_config: {
			fetch: {
				path: 'https://dundermifflin.com/api/paper'
				headers: {
					'Content-Type': 'x-beet-farmer'
				}
			}
		}
	},
	aGrouping: {
		apiOne: {
			_config: {
				fetch: {
					path: '/api/one'
				}
			}
		},
		apiTwo: {
			_config: {
				fetch: {
					path: '/api/two/{{models.futurama.zoidberg}}'
				}
			}
		}
	},
	basicPost: {
		_config: {
			fetch: {
				path: '/api/createSomeThing'
				method: 'POST'
			}
		}
	},
	basicPostTwo: {
		_config: {
			fetch: {
				path: '/api/createSomeKnownThing'
				method: 'POST',
				body: { person: 'Fry' }
			}
		}
	},
	entities: {
		_config: {
			fetch: {
				path: '/api/entities'
			},
			isCollection: true
		}
	},
	topLevelEntities: {
		_config: {
			isCollection: true
		},
		secondLevelEntities: {
			_config: {
				isCollection: true
			}
		}
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
[Collections](#collections)  
[Nested Collections](#nested-collections)  

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

### Add route params:

*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'theWalkers',
	queryParams: {walkerId: 1}
})
```
*request generated*
```http
GET https://thewalkingdead/api/walker/1
```
*resulting redux*

Same as basic fetch above, with possibly different data, depending on response relative to new route params

**Note**: Route parameters specified in the action will be merged with route parameters specified in `apis.js` with the route params in the action taking precedence

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
{"ruleOne": "Don't talk about Fight Club","ruleTwo": "Don't talk about Fight Club"}
```
*resulting redux*

Same as basic fetch above, with the `data` key containing the response data from the `POST` request

#

### Collections

#### GET all
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'entities'
})
```
*request generated*
```http
GET https://myapp.com/api/entities
```
*resulting redux*
```js
{
	models: {
		entities: {
			data: {
				1: {
					data: {id: 1, ...},
					isFetching: false,
					hasError: false,
					timedOut: false,
					fetchedAt: '2017-05-23T20:38:11.103Z'
				},
				...
			},
			isFetching: false,
			hasError: false,
			timedOut: false,
			fetchedAt: '2017-05-23T20:38:11.103Z'
		}
	}
}
```

#### GET item
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'entities',
	pathParams: [1]
})
```
*request generated*
```http
GET https://myapp.com/api/entities/1
```
*resulting redux*  
Updates item in store at `entities.1`

#### POST item
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'entities',
	method: 'POST',
	body: {
		name: 'entity name'
	}
})
```
*request generated*
```http
Content-Type: application/json
POST https://myapp.com/api/entities/1
{"name": "entity name"}
```
*resulting redux*  
Adds item in store at `entities` under the return object's `id`

*Note*  
During the request, status is stored in `entities` under a `guid` key, which can be provided in the action for tracking

#### PATCH item
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'entities',
	method: 'PATCH'
	pathParams: [1],
	body: {
		op: 'replace',
		path: 'Name',
		value: 'updated group name'
	}
})
```
*request generated*
```http
Content-Type: application/json
PATCH https://myapp.com/api/entities/1
{"op": "replace", "path": "Name", "value": "updated group name"}
```

*resulting redux*  
Updates item in store at `entities.1`

*Note*  
See http://jsonpatch.com/

#### DELETE Entity
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'entities',
	method: 'DELETE'
	pathParams: [1]
})
```
*request generated*
```http
DELETE https://myapp.com/api/entities/1
```
*resulting redux*  
Removes item in store at `entities.1`

#

### Nested Collections

Nested collections behave the same as normal collections, but require a `pathParams` to have at least one value per nested level.

#### GET all
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'topLevelEntities.secondLevelEntities',
	pathParams: [1]
})
```
*request generated*
```http
GET https://myapp.com/api/topLevelEntities/1/secondLevelEntities
```
*resulting redux*
```js
{
	models: {
		topLevelEntities: {
			data: {
				1: {
					data: {
						id: 1, 
						secondLevelEntities: {
							data: {
								999: {
									data: {id: 999, ...},
									isFetching: false,
									hasError: false,
									timedOut: false,
									fetchedAt: '2017-05-23T20:38:11.103Z'
								},
								...
							},
							isFetching: false,
							hasError: false,
							timedOut: false,
							fetchedAt: '2017-05-23T20:38:11.103Z'
						}
						...
					},
					...
				},
				...
			},
			...
		}
	}
}
```
Stores item in object as key/value pairs in store at `topLevelEntities.1.secondLevelEntities`


#### GET item
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'topLevelEntities.secondLevelEntities',
	pathParams: [1, 999]
})
```
*request generated*
```http
GET https://myapp.com/api/topLevelEntities/1/secondLevelEntities/999
```
*resulting redux*  
Updates item in store at `topLevelEntities.1.secondLevelEntities.999`


#### POST item
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'topLevelEntities.secondLevelEntities',
	pathParams: [1],
	method: 'POST',
	body: {
		name: 'entity name'
	}
})
```
*request generated*
```http
Content-Type: application/json
POST https://myapp.com/api/topLevelEntities/1/secondLevelEntities
{"name": "entity name"}
```
*resulting redux*  
Adds item in store at `topLevelEntities.1.secondLevelEntities` under the return object's `id`

*Note*  
During the request, status is stored in `topLevelEntities.1.secondLevelEntities` under a `guid` key, which can be provided in the action for tracking

#### PATCH item
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'topLevelEntities.secondLevelEntities',
	method: 'PATCH'
	pathParams: [1, 999],
	body: {
		op: 'replace',
		path: 'Name',
		value: 'updated group name'
	}
})
```
*request generated*
```http
Content-Type: application/json
PATCH https://myapp.com/api/topLevelEntities/1/secondLevelEntities/999
{"op": "replace", "path": "Name", "value": "updated group name"}
```

*resulting redux*  
Updates item in store at `topLevelEntities.1.secondLevelEntities.999`

*Note*  
See http://jsonpatch.com/

#### DELETE Entity
*dispatch*
```js
store.dispatch({
	type: netActions.DATA_REQUESTED,
	modelName: 'topLevelEntities.secondLevelEntities',
	method: 'DELETE'
	pathParams: [1, 999]
})
```
*request generated*
```http
DELETE https://myapp.com/api/topLevelEntities/1/secondLevelEntities/999
```
*resulting redux*  
Removes item in store at `topLevelEntities.1.secondLevelEntities.999`

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
