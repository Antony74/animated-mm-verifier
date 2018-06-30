import * as React from 'react';
import { render } from 'react-dom';
import { MMParser } from './mm.parser';
import { MMStatement } from './mm.statement';

const P5 = require('p5');

function App() {

  return (
    <div>Hello, World!</div>
  );
}

render(
  <App />,
  document.getElementById('root'),
);

const mm: MMParser = new MMParser('public/set.mm');
// const mm: MMParser = new MMParser('public/demo0.mm');

let count = 0;

mm.statementStream.subscribe(
{
  next: (statement: MMStatement) => {
    ++count;
//    console.log(statement.toString());
    mm.nextStatement();
  },
  error: (error: any) => {
    console.error(error);
  },
  complete: () => {
    console.log('Done.  ' + count + ' statements');
  }
});

// mm.nextStatement();

const sketch = new P5((p5) => {

  p5.setup = () => {
    console.log('setup');
  };

  p5.draw = () => {
    p5.background(230);
    p5.fill(255, 0, 255);
    p5.ellipse(50, 50, 70, 70);
    p5.noLoop();
  };

});


