import * as React from 'react';
import { render } from 'react-dom';

import { Machine } from 'xstate';
import { createStore, combineReducers, applyMiddleware, Action } from 'redux';
import { createMiddleware as createReduxXStateMiddleware, createReducer as createReduxXStateReducer } from 'redux-xstate';

import { createChunkDownloaderModule } from './chunk-downloader';

const url = 'public/set.mm';

const chunkDownloader = createChunkDownloaderModule(url);

const machine = Machine(chunkDownloader.machineConfig);

const store = createStore(
  combineReducers({
    machine: createReduxXStateReducer(machine.initialState),
    chunkDownload: chunkDownloader.reducers
  }),
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
  applyMiddleware(createReduxXStateMiddleware(machine, chunkDownloader.effects)),
);

store.dispatch({type: 'REQUEST_CHUNK'});

function App() {

  return (
    <div>Hello, World!</div>
  );
}

render(
  <App />,
  document.getElementById('root'),
);

