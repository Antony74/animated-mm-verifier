import * as superagent from 'superagent';
import { MachineConfig } from 'xstate/lib/types';

import { MachineModule } from './machine-module';
import { ChunkDownloadState, chunkDownloadInitialState } from './chunk-downloader.state';
import { State } from './state';

export function createChunkDownloaderModule(url: string): MachineModule {

  const machineConfig: MachineConfig = {
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

  const effects: { [key: string]: (dispatch, state) => void } = {

    onReady: (dispatch, state) => {
      dispatch({ type: 'REQUEST_CHUNK' });
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
          dispatch({ type: 'ADD_CHUNK', payload: response.body });
          dispatch({ type: 'GOT_CHUNK' });
        }).catch((error: superagent.ResponseError) => {
          if (error.status === 404 && sFileCount !== '001') {
            dispatch({ type: 'COMPLETE' });
          } else {
            dispatch({ type: 'ERROR', payload: error.message });
          }
        });

      dispatch({ type: 'INCREMENT_URL_CHUNK' });
      dispatch({ type: 'WAITING' });
    },

    onGotChunk: (dispatch, state: State) => {
      console.log(state.chunkDownload.chunks);
      dispatch({ type: 'READY' });
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

  return {
    machineConfig: machineConfig,
    effects: effects,
    reducers: chunkDownloadReducer
  };
}

