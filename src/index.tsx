import * as React from 'react';
import { render } from 'react-dom';

import { Machine } from 'xstate';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { createMiddleware, createReducer } from 'redux-xstate';

const LOG_URL = '';

const actionMap = {
  log: (dispatch, state) => fetch(LOG_URL, {
    method: 'POST',
    body: JSON.stringify(state)
  })
};

const stateChart = {
  key: 'light',
  initial: 'green',
  states: {
    green: {
      on: {
        TIMER: 'yellow'
      }
    },
    yellow: {
      on: {
        TIMER: 'red'
      }
    },
    red: {
      on: {
        TIMER: 'green'
      },
      onEntry: ['log']
    }
  }
};

const machine = Machine(stateChart);

const store = createStore(
  combineReducers({
    machine: createReducer(machine.initialState)
  }),
  (window as any).__REDUX_DEVTOOLS_EXTENSION__ && (window as any).__REDUX_DEVTOOLS_EXTENSION__(),
  applyMiddleware(createMiddleware(machine, actionMap)),
);

store.dispatch({type: 'TIMER'});

console.log(store.getState());

// state.machine.value === "yellow"

function App() {

  return (
    <div>Hello, World!</div>
  );
}

render(
  <App />,
  document.getElementById('root'),
);

