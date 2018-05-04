import * as React from 'react';
import './App.css';
import { ProcessEditor } from './ui/ProcessEditor';
import { StartStep, StopStep, Type, Parameter, ProcessStep, SystemProcess, UserProcess, Workspace } from './data';

const stringType = new Type('text', '#00cc00', undefined, /.*/, 'Any old text');
const numberType = new Type('number', '#0099ff', undefined, /^\d*$/, 'A number');
const boolType = new Type('boolean', '#cc6600', undefined, undefined, 'true or false');

const workspace = new Workspace();

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
workspace.userProcesses.add(parentProcess.name, parentProcess);

const systemProcess = new SystemProcess(
    'System process',
    [],
    [],
    [],
    'An example process that doesn\'t really exist',
    'Root',
);
workspace.systemProcesses.add(systemProcess.name, systemProcess);

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
workspace.userProcesses.add(userProcess.name, userProcess);

const startStep = new StartStep(1, parentProcess, 32, 48);
const stopStep = new StopStep(2, parentProcess, 'Yea', 800, 256);
const systemStep = new ProcessStep(3, systemProcess, parentProcess, 176, 48);
const userStep = new ProcessStep(4, userProcess, parentProcess, 448, 64);

parentProcess.steps.push(startStep, stopStep, systemStep, userStep);

class App extends React.Component {
  render() {
    return <ProcessEditor className="fullScreen" workspace={workspace} initialProcess={parentProcess} />;
  }
}

export default App;
