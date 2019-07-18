import { IWorkspaceState } from '../state/IWorkspaceState';
import { hasEditableSignature } from '../services/ProcessFunctions';

export type RemoveProcessAction = {
    type: 'remove process';
    name: string;
}

export function removeProcess(state: IWorkspaceState, action: RemoveProcessAction) {
    const index = state.processes.findIndex(p => p.name === action.name);

    if (index === -1) {
        return state;
    }

    const processes = state.processes.slice();

    const process = processes.splice(index, 1)[0];

    if (!hasEditableSignature(process)) {
         return state;
    }

    const errors = { ...state.errors };
    delete errors[process.name];
    // TODO: add errors to any other processes which used this deleted one

    return {
        ...state,
        processes,
        errors,
    };
}