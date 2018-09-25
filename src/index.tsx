import * as React from 'react';
import { render } from 'react-dom';

import { Machine } from 'xstate';
import { createStore, combineReducers, applyMiddleware, Action } from 'redux';
import { createMiddleware as createReduxXStateMiddleware, createReducer as createReduxXStateReducer } from 'redux-xstate';
import { MachineConfig } from 'xstate/lib/types';
import * as superagent from 'superagent';

const url = 'public/set.mm';

enum chunkDownloadActions {
  incrementUrlChunk = 'INCREMENT_URL_CHUNK',
  requestChunk = 'REQUEST_CHUNK'
}

class IncrementUrlChunkAction implements Action {
  readonly type = chunkDownloadActions.incrementUrlChunk;
}

class RequestChunkAction implements Action {
  readonly type = chunkDownloadActions.requestChunk;
}

interface ChunkDownloadState {
  nextChunk: number;
}

const chunkDownloadInitialState: ChunkDownloadState = {
  nextChunk: 1
};

interface State {
  machine: any;
  chunkDownload: ChunkDownloadState;
}

const effects = {
  onRequestChunk: (dispatch, state: State) => {
    let sFileCount: string = state.chunkDownload.nextChunk.toString();
    while (sFileCount.length < 3) {
        sFileCount = '0' + sFileCount;
    }

    superagent
      .get(url + '.gz.' + sFileCount)
      .responseType('arraybuffer')
      .then((response: superagent.Response) => {
//            this.eState = State.ready;
//          this.inflate.push(response.body, false);
      }).catch((error: superagent.ResponseError) => {
          if (error.status === 404 && this.fileIndex !== 1) {
//                this.eState = State.eof;
//              this.inflate.push(new ArrayBuffer(0), true);

//              if (this.data.getLength() === 0) {
//                  this.complete = true;
//                  this.tokenSubject.complete();
//              }

          } else {
//              this.tokenSubject.error(error);
          }
      });
  }
};

function chunkDownloadReducer(state: ChunkDownloadState = chunkDownloadInitialState, action: Action): ChunkDownloadState {
  switch (action.type) {
    case chunkDownloadActions.incrementUrlChunk:
      return {...state, nextChunk: ++state.nextChunk};
  }

  return state;
}

const stateChart: MachineConfig = {
  initial: 'idle',
  states: {
    idle: {
      on: {
        REQUEST_CHUNK: 'requestChunk'
      }
    },
    requestChunk: {
      onEntry: ['onRequestChunk']
    },
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

store.dispatch(new RequestChunkAction());
store.dispatch(new IncrementUrlChunkAction());

function App() {

  return (
    <div>Hello, World!</div>
  );
}

render(
  <App />,
  document.getElementById('root'),
);

