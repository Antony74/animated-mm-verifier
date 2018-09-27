import * as React from 'react';
import { render } from 'react-dom';

import { Machine } from 'xstate';
import { createStore, combineReducers, applyMiddleware, Action } from 'redux';
import { createMiddleware as createReduxXStateMiddleware, createReducer as createReduxXStateReducer } from 'redux-xstate';
import { MachineConfig } from 'xstate/lib/types';
import * as superagent from 'superagent';

const url = 'public/set.mm';

interface ChunkDownloadState {
  nextChunk: number;
  chunks: ArrayBuffer[];
}

const chunkDownloadInitialState: ChunkDownloadState = {
  nextChunk: 1,
  chunks: []
};

interface State {
  machine: any;
  chunkDownload: ChunkDownloadState;
}

const effects = {

  onReady: (dispatch, state: State) => {
    dispatch({type: 'REQUEST_CHUNK'});
  },

  onRequestChunk: (dispatch, state: State) => {
    let sFileCount: string = state.chunkDownload.nextChunk.toString();
    while (sFileCount.length < 3) {
        sFileCount = '0' + sFileCount;
    }

    superagent
      .get(url + '.gz.' + sFileCount)
      .responseType('arraybuffer')
      .then((response: superagent.Response) => {
        dispatch({type: 'ADD_CHUNK', payload: response.body});
        dispatch({type: 'GOT_CHUNK'});
      }).catch((error: superagent.ResponseError) => {
          if (error.status === 404 && sFileCount !== '001') {
            dispatch({type: 'COMPLETE'});
          } else {
            dispatch({type: 'ERROR', payload: error.message});
          }
      });

    dispatch({type: 'INCREMENT_URL_CHUNK'});
    dispatch({type: 'WAITING'});
  },

  onGotChunk: (dispatch, state: State) => {
    console.log(state.chunkDownload.chunks);
    dispatch({type: 'READY'});
  },

  onComplete: () => {
    console.log('onComplete');
  }

};

function chunkDownloadReducer(state: ChunkDownloadState = chunkDownloadInitialState, action): ChunkDownloadState {
  switch (action.type) {
    case 'INCREMENT_URL_CHUNK':
      return {...state, nextChunk: ++state.nextChunk};
    case 'ADD_CHUNK':
      return {...state, chunks: [...state.chunks, action.payload]};
  }

  return state;
}

const stateChart: MachineConfig = {
  initial: 'ready',
  states: {
    ready: {
      onEntry: ['onReady'],
      on: {
        REQUEST_CHUNK: 'requestChunk'
      }
    },
    requestChunk: {
      onEntry: ['onRequestChunk'],
      on: {
        WAITING: 'waiting'
      },
    },
    waiting: {
      on: {
        GOT_CHUNK: 'gotChunk',
        COMPLETE: 'complete'
      }
    },
    gotChunk: {
      onEntry: ['onGotChunk'],
      on: {
        READY: 'ready'
      }
    },
    error: {
      onEntry: ['onError']
    },
    complete: {
      onEntry: ['onComplete']
    }
  }
};

const machine = Machine(stateChart);

const store = createStore(
  combineReducers({
    machine: createReduxXStateReducer(machine.initialState),
    chunkDownload: chunkDownloadReducer
  }),
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
  applyMiddleware(createReduxXStateMiddleware(machine, effects)),
);

// Monkey-patch store.dispatch to be TypeScript-friendly
const plainDispatch = store.dispatch;

store.dispatch = ((action: Action) => {
  plainDispatch(Object.assign({}, action));
}) as any;
// End of monkey-patch

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

