import { Workspace } from './data';

self.onmessage = async e => {
    console.log('in the worker');
    
    const xml = await fetch('workspace.xml');
    console.log('fetched');

    Workspace.loadFromString(await xml.text());
    console.log('loaded from string');
};