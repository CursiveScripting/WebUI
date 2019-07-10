import { Reducer} from 'react';
import { WorkspaceAction } from './actions';
import { IWorkspaceState } from './IWorkspaceState';
import { IUserProcess } from './IUserProcess';
import { hasEditableSignature, isUserProcess, determineStepId } from '../services/StepFunctions';
import { IVariable } from './IVariable';
import { IProcessStep } from './IProcessStep';
import { StepType } from './IStep';

export const workspaceReducer: Reducer<IWorkspaceState, WorkspaceAction> = (state, action) => {
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

            const stepProcess = processes.find(p => p.name === action.stepProcessName);
            if (stepProcess === undefined) {
                return state; // invalid process
            }

            inProcess.steps = [...inProcess.steps, <IProcessStep>{
                uniqueId: determineStepId(inProcess.steps),
                processName: action.stepProcessName,
                inputs: {},
                outputs: {},
                returnPaths: {},
                stepType: stepProcess.isSystem
                    ? StepType.SystemProcess
                    : StepType.UserProcess,
                x: action.x,
                y: action.y,
            }];

            processes[inProcessIndex] = inProcess;
            
            return {
                ...state,
                processes,
            };
        }

        case 'remove step': {
            const processIndex = processes.findIndex(p => p.name === action.processName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }
            
            const steps = process.steps.slice();

            const index = steps.findIndex(step => step.uniqueId === action.stepId);

            steps.splice(index, 1);

            process.steps = steps;

            processes[processIndex] = process;

            return {
                ...state,
                processes,
            };
        }

        case 'add variable': {
            if (!state.types.hasOwnProperty(action.typeName)) {
                return state; // invalid type
            }

            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }

            process.variables = [...process.variables, <IVariable>{
                name: action.varName,
                typeName: action.typeName,
                fromLinks: [],
                toLinks: [],
                initialValue: null,
                x: action.x,
                y: action.y,
            }];
            
            processes[processIndex] = process;

            return {
                ...state,
                processes,
            };
        }

        case 'remove variable': {
            const processIndex = processes.findIndex(p => p.name === action.inProcessName);

            const process = { ...processes[processIndex] };

            if (!isUserProcess(process)) {
                return state;
            }

            const varIndex = process.variables.findIndex(v => v.name === action.varName);

            if (varIndex === -1) {
                return state;
            }

            process.variables = process.variables.slice();
            process.variables.splice(varIndex, 1);

            return {
                ...state,
                processes,
            };
        }
    }
}