import * as React from 'react';
import './App.css';
import { ProcessContent } from './ui/ProcessContent';
import { StartStep, StopStep, Type, Parameter, ProcessStep, SystemProcess, UserProcess } from './data';

const stringType = new Type('text', '#00cc00', undefined, /.*/, 'Any old text');
const numberType = new Type('number', '#0099ff', undefined, undefined, 'A number');
const boolType = new Type('boolean', '#cc6600', undefined, undefined, 'true or false');

const parentProcess = new UserProcess(
    'Example parent',
    [new Parameter('Parent input 1', stringType), new Parameter('Parent input 2', numberType)],
    [new Parameter('Parent output', boolType)],
    [],
    ['Yea', 'Nay'],
    true,
    'Some parent process to do something',
    ''
);

const systemProcess = new SystemProcess(
    'System process',
    [],
    [],
    [],
    'An example process that doesn\'t really exist',
    'Root',
);

const userProcess = new UserProcess(
    'User process',
    [new Parameter('Input 1', stringType), new Parameter('Input 2', numberType)],
    [new Parameter('Output', boolType)],
    [],
    ['Yea', 'Nay'],
    true,
    'Some process to do something',
    ''
);

const startStep = new StartStep(1, parentProcess, 32, 48);
const stopStep = new StopStep(2, parentProcess, 'Yea', 800, 256);
const systemStep = new ProcessStep(3, systemProcess, parentProcess, 176, 48);
const userStep = new ProcessStep(4, userProcess, parentProcess, 448, 64);

parentProcess.steps.push(startStep, stopStep, systemStep, userStep);

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <p className="App-intro">
          To get started, edit <code>src/App.tsx</code> and save to reload.
        </p>

        <ProcessContent process={parentProcess} style={{height: '500px'}} />
      </div>
    );
  }
}

export default App;
