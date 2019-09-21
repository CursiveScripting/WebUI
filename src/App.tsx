import * as React from 'react';
import './App.css';
import CursiveUI, { ICustomTool, IUserProcessData } from './cursiveui';

async function loadWorkspace() {
    const response = await fetch('workspace.json');
    return await response.json();
}

async function loadProcesses() {
    const saved = sessionStorage.getItem('saved');
    
    return saved === null
        ? null
        : JSON.parse(saved);
}

async function saveProcesses(processData: IUserProcessData[]) {
    const processJson = JSON.stringify(processData);
    sessionStorage.setItem('saved', processJson);
}

const customTools: ICustomTool[] = [{
    prompt: 'Close editor',
    iconBackground: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='feather feather-x'><line x1='18' y1='6' x2='6' y2='18'></line><line x1='6' y1='6' x2='18' y2='18'></line></svg>")`,
    unsavedConfirmation: 'Discard all unsaved changes?',
    action: () => alert('Editor closed'),
}];

const App = () => (
    <CursiveUI
        className="fullScreen"
        loadWorkspace={loadWorkspace}
        loadProcesses={loadProcesses}
        saveProcesses={saveProcesses}
        customTools={customTools}
    />
);

export default App;
