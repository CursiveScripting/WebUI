import { Reducer} from 'react';
import { WorkspaceAction } from './actions';
import { IWorkspace } from './IWorkspace';
import { IUserProcess } from './IUserProcess';
import { hasEditableSignature, isUserProcess } from '../services/StepFunctions';

export const workspaceReducer: Reducer<IWorkspace, WorkspaceAction> = (state, action) => {
    const processes = state.processes.slice();

    switch (action.type) {
        case 'load': {
            return {
                types: action.types,
                processes: action.processes,
            };
        }

        case 'add process': {
            const index = processes.findIndex(p => p.name === action.name);

            if (index === -1) {
                return state;
            }

            const newProcess: IUserProcess = {
                name: action.name,
                description: action.description,
                folder: action.folder,
                inputs: action.inputs,
                outputs: action.outputs,
                returnPaths: action.returnPaths,
                steps: [],
                variables: [],
                isSystem: false,
                fixedSignature: false,
            };

            processes.push(newProcess);

            return {
                ...state,
                processes,
            };
        }

        case 'remove process': {
            const index = processes.findIndex(p => p.name === action.name);

            if (index === -1) {
                return state;
            }

            const process = processes.splice(index, 1)[0];

            if (!hasEditableSignature(process)) {
                 return state;
            }

            return {
                ...state,
                processes,
            };
        }

        case 'add step': {
            const inProcessIndex = processes.findIndex(p => p.name === action.inProcessName);

            if (inProcessIndex === -1) {
                return state;
            }

            const inProcess = { ...processes[inProcessIndex] };
            
            if (!isUserProcess(inProcess)) {
                return state;
            }

            
            // TODO

            return {
                ...state,
                processes,
            };
        }

        case 'remove step':
            const processIndex = processes.findIndex(p => p.name === action.processName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }
            
            const steps = process.steps.slice();

            const index = steps.findIndex(step => step.uniqueId === action.stepId);

            steps.splice(index, 1);

            process.steps = steps;

            return {
                ...state,
                processes,
            };
    }
}