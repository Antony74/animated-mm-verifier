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

const mm: MMFile = new MMFile('public/demo0.mm');


mm.tokenStream.subscribe(
  (token: string) => {
  },
  (error: any) => {
    console.error(error);
  },
  () => {
    console.log('done');
  });

mm.nextToken();

