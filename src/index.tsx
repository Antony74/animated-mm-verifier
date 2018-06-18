import * as React from 'react';
import { render } from 'react-dom';
import { MMStatements } from './mm.statements';
import { MMStatement } from './mm.statement';

function App() {

  return (
    <div>Hello, World!</div>
  );
}

render(
  <App />,
  document.getElementById('root'),
);

// const mm: MMStatements = new MMStatements('public/set.mm');
const mm: MMStatements = new MMStatements('public/demo0.mm');

let count = 0;

mm.statementStream.subscribe(
{
  next: (statement: MMStatement) => {
    ++count;
//    setImmediate(() => {
//      mm.nextStatement();
//    });
  },
  error: (error: any) => {
    console.error(error);
  },
  complete: () => {
    console.log('Done.  ' + count + ' statements');
  }
});

mm.nextStatement();

