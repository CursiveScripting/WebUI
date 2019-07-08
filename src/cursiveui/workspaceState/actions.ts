import { Type } from '../data';
import { IParameter } from './IParameter';
import { IProcess } from './IProcess';

export type WorkspaceAction = {
    type: 'load';
    types: Type[];
    processes: IProcess[];
} | {
    type: 'add process';
    name: string;
    description: string;
    folder: string | null;
    returnPaths: string[];
    inputs: IParameter[];
    outputs: IParameter[];
} | {
    type: 'remove process';
    name: string;
} | {
    type: 'add step';
    inProcessName: string;
    stepProcessName: string;
    x: number;
    y: number;
} | {
    type: 'remove step';
    processName: string;
    stepId: string;
}