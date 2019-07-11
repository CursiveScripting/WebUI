import { createContext, Dispatch } from 'react';
import { IParameter } from './IParameter';
import { IProcess } from './IProcess';
import { IType } from './IType';

export type WorkspaceAction = {
    type: 'load';
    types: IType[];
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
    type: 'edit process';
    oldName: string;
    newName: string;
    description: string;
    folder: string | null;
    returnPaths: string[];
    inputs: IParameter[];
    outputs: IParameter[];
    mapInputs: (prev: string) => string | undefined;
    mapOutputs: (prev: string) => string | undefined;
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
    type: 'add stop step';
    inProcessName: string;
    returnPath: string | null;
    x: number;
    y: number;
} | {
    type: 'remove step';
    processName: string;
    stepId: string;
} | {
    type: 'add variable';
    inProcessName: string;
    typeName: string;
    varName: string;
    x: number;
    y: number;
} | {
    type: 'remove variable';
    inProcessName: string;
    varName: string;
} | {
    type: 'move step';
    inProcessName: string;
    stepId: string;
    x: number;
    y: number;
} | {
    type: 'move variable';
    inProcessName: string;
    varName: string;
    x: number;
    y: number;
} | {
    type: 'set return path';
    inProcessName: string;
    fromStepId: string;
    toStepId?: string;
    pathName: string | null;
} | {
    type: 'link variable';
    inProcessName: string;
    varName?: string;
    stepId: string;
    stepParamName: string;
    stepInputParam: boolean;
}

export const WorkspaceDispatchContext = createContext<Dispatch<WorkspaceAction>>(ignore => {});