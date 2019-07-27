import { IParameter } from '../state/IParameter';
import { IUserProcess } from '../state/IUserProcess';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { validate } from './validate';
import { StepType } from '../state/IStep';
import { IStartStep } from '../state/IStartStep';
import { gridSize } from '../ui/ProcessContent/gridSize';
import { createEmptyStartStep } from '../services/StepFunctions';

export type AddProcessAction = {
    type: 'add process';
    name: string;
    description: string;
    folder: string | null;
    returnPaths: string[];
    inputs: IParameter[];
    outputs: IParameter[];
}

export function addProcess(state: IWorkspaceState, action: AddProcessAction) {
    const index = state.processes.findIndex(p => p.name === action.name);

    if (index !== -1) {
        return state;
    }

    const inputs = action.inputs.map(param => { return { ...param } });

    const newProcess: IUserProcess = {
        name: action.name,
        description: action.description,
        folder: action.folder,
        inputs: action.inputs,
        outputs: action.outputs,
        returnPaths: action.returnPaths,
        steps: [createEmptyStartStep(inputs)],
        variables: [],
        isSystem: false,
        fixedSignature: false,
        errors: [],
    };

    const processes = [...state.processes, newProcess];
    newProcess.errors = validate(newProcess, processes);

    return {
        ...state,
        processes,
    }
}