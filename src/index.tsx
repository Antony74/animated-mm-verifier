import * as React from 'react';
import { render } from 'react-dom';
import { MMFile } from './mm.file';

function App() {

  return (
    <div>Hello, World!</div>
  );
}

render(
  <App />,
  document.getElementById('root'),
);

const mm: MMFile = new MMFile('public/set.mm');

mm.tokenStream.subscribe(
  (token: string) => {
//    console.log(token);
    setImmediate(() => {
      mm.nextToken();
    });
  },
  (error: any) => {
    console.error(error);
  },
  () => {
    console.log('done');
  });

mm.nextToken();

