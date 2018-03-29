import * as React from 'react';
import './App.css';
import { StepDisplay } from './ui/StepDisplay';
import { StartStep, StopStep, Type, Parameter, ProcessStep, SystemProcess, UserProcess } from './data';

const logo = require('./logo.svg');

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

const startStep = new StartStep(1, parentProcess, 50, 50);
const stopStep = new StopStep(2, parentProcess, 'Yea', 50, 50);
const systemStep = new ProcessStep(3, systemProcess, parentProcess, 50, 50);
const userStep = new ProcessStep(4, userProcess, parentProcess, 50, 50);

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.tsx</code> and save to reload.
        </p>

        <StepDisplay step={startStep} readonly={false} />
        <StepDisplay step={stopStep} readonly={false} />
        <StepDisplay step={systemStep} readonly={false} />
        <StepDisplay step={userStep} readonly={false} />
      </div>
    );
  }
}

export default App;
