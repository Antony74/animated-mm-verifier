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
// const mm: MMFile = new MMFile('public/demo0.mm');

let tokenCount = 0;

mm.tokenStream.subscribe(
  (token: string) => {
    ++tokenCount;
    if (tokenCount % 1000) {
      setImmediate(() => {
        mm.nextToken();
      });
    } else {
      mm.nextToken();
    }
  },
  (error: any) => {
    console.error(error);
  },
  () => {
    console.log('Done.  ' + tokenCount + ' tokens');
  });

mm.nextToken();

