import * as React from 'react';
import './App.css';
import { CursiveUI } from './cursiveui/CursiveUI';

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

const App = () => (
    <CursiveUI
        className="fullScreen"
        loadWorkspace={loadWorkspace}
        loadProcesses={loadProcesses}
        saveProcesses={saveProcesses}
    />
);

export default App;
