import * as React from 'react';
import './App.css';
import CursiveUI from './cursiveui';
import { ICustomTool } from './cursiveui/ICustomTool';

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

async function saveProcesses(processJson: string) {
    sessionStorage.setItem('saved', processJson);
}

const customTools: ICustomTool[] = [{
    prompt: 'Close editor',
    icon: 'tool--close',
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
