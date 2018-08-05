import * as React from 'react';
import { render } from 'react-dom';
import { createParser } from './mm.parser';
import { MMStatement } from './mm.statement';
import { Stream, Observer } from './stream';

const P5 = require('p5');

function App() {

  return (
    <div></div>
  );
}

render(
  <App />,
  document.getElementById('root'),
);

enum EPhase {
  statementAppears,
  statementFades,
  statementDone
}

const mm: Stream<MMStatement> = createParser('public/set.mm');
// const mm: MMParser = new MMParser('public/demo0.mm');

let observer: Observer<MMStatement> = null;

const speed = 10;

const _ = new P5((p5) => {

  let phase: EPhase = EPhase.statementAppears;
  let phasePos = 0;
  let statement: MMStatement;
  let proofCount = 0;

  observer = {
    next: (st: MMStatement): boolean => {
      statement = st;
      phase = EPhase.statementAppears;
      phasePos = 0;

      if (statement.getType() === '$p') {
        ++proofCount;
      }

      return false;
    },
    error: (error: any) => {
      console.error(error);
    },
    complete: () => {
      console.log('Done.');
    }
  };

  p5.setup = () => {
    p5.createCanvas(1024, 456); // aspect ratio 16:9
  };

  p5.draw = () => {

    const backColor: number[] = [230, 230, 230];
    const textColor: number[] = [0, 0, 0];
    p5.background(backColor[0], backColor[1], backColor[2]);

    if (!statement) {
      return;
    }

    const mainStatementBottom = p5.height * 0.95;
    const mainStatementLeft = p5.width * 0.15;
    p5.textSize(p5.height * 0.03);

    switch (phase) {
    case EPhase.statementAppears:
      p5.fill(textColor[0], textColor[1], textColor[2]);

      p5.text(
        statement.toString(),
        mainStatementLeft,
        p5.map(phasePos, 0, 1, p5.height + p5.textAscent() + p5.textDescent(), mainStatementBottom));

      phasePos += 0.005 * speed;
      if (phasePos > 1) {
        phase = EPhase.statementFades;
        phasePos = 0;
      }
      break;

    case EPhase.statementFades:
      p5.fill(
        p5.map(phasePos, 0, 1, textColor[0], backColor[0]),
        p5.map(phasePos, 0, 1, textColor[1], backColor[1]),
        p5.map(phasePos, 0, 1, textColor[2], backColor[2])
      );

      p5.text(statement.toString(), mainStatementLeft, mainStatementBottom);

      phasePos += 0.005 * speed;
      if (phasePos > 1 && proofCount < 10) {
        phase = EPhase.statementDone;
        phasePos = 0;
        mm.read(observer);
      }
      break;

    case EPhase.statementDone:
      break;
    }

  };

});

mm.read(observer);

