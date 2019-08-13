import * as React from 'react';
import './App.css';
import CursiveUI from './cursiveui';
import { ICustomTool } from './cursiveui/ICustomTool';

async function loadWorkspace() {
    const response = await fetch('workspace.xml');
    return await response.text();
}

async function loadProcesses() {
    return sessionStorage.getItem('saved');
}

async function saveProcesses(processXml: string) {
    sessionStorage.setItem('saved', processXml);
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
