import { IWorkspaceState } from '../state/IWorkspaceState';
import { hasEditableSignature, isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';
import { isProcessStep } from '../services/StepFunctions';

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

    const deleteProcess = processes.splice(index, 1)[0];

    if (!hasEditableSignature(deleteProcess)) {
         return state;
    }

    for(const process of processes) {
        if (isUserProcess(process) && process.steps.find(s => isProcessStep(s) && s.process === deleteProcess)) {
            // TODO: trigger remove step action on every step that uses the deleted process!
            process.errors = validate(process, processes);
        }
    }

    return {
        ...state,
        processes,
    };
}