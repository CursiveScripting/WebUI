import { IParameter } from '../state/IParameter';
import { IUserProcess } from '../state/IUserProcess';
import { IWorkspaceState } from '../state/IWorkspaceState';

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

    return {
        ...state,
        processes: [...state.processes, newProcess],
    };
}