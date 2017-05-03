# How to use this template

This template is a starting point for a studiokit library to encapsulate and provide business logic via an NPM package.

## How to create

### Development

During development of this library, you can clone this project and use

`yarn link`

to make the module available to another project's `node_modules` on the same computer without having to publish to a repo and pull to the other project. In the other folder, you can use

`yarn link studiokit-foo-js`

to add `studiokit-foo-js` to the consuming project's `node_modules`

### Build

Because this is a module, you'll need to transpile the source to ES5 since the consuming project won't transpile anything in `node_modules`

`yarn build`

will transpile everything in `/src` to `/lib`. `/lib/index.js` is the entry point indicated in `package.json`

During development, you can run

`yarn build:watch`

and babel will rebuild the `/lib` folder when any file in `/src` changes.

### Deploy

Deployment will likely be via Git unless we build our own npm repo. Example

`yarn add git@sprinklesthecat.ics.purdue.edu:studiokit-js/studiokit-foo-js.git#master`

## How to use

Your consuming application will need to implement a store and tie in the saga middleware, i.e.

```
import createSagaMiddleware from 'redux-saga'
import reducer from './reducers'
import rootSaga from './sagas'
import createSagaMiddleware from 'redux-saga'
import { createStore,	applyMiddleware } from 'redux'

const sagaMiddleware = createSagaMiddleware()
const store = createStore(
	reducer, composeWithDevTools(
		applyMiddleware(sagaMiddleware)
	))

sagaMiddleware.run(rootSaga)
```

`reducer` would be a module, i.e.

```
import { combineReducers } from 'redux'
import { reducers } from 'studiokit-template-js'

export default combineReducers({
	foo: reducers.foo
})
```

and `rootSaga` would be a composition of other sagas, i.e.

```
import { all } from 'redux-saga/effects'
import { sagas } from 'studiokit-foo-js'

export default function* rootSaga() {
	yield all({
		fooSaga: sagas.fooSaga()
	})
}
```

## What it includes

#### Structure

The top-level `index.js` exports all modules in `sagas`, `reducers`, and `actions`. Each of those folders should export functions via their `index.js`, referencing modules in sibling files. `services` is not intended to be exported out of the module.

#### Sagas

The implementations of logic and flow via `redux-saga` [sagas](https://redux-saga.js.org/).

#### Actions

Standard redux actions plus an action creator function

#### Reducers

Standard redux reducers

#### Services

Functions to provide side effects, computation, I/O, etc.