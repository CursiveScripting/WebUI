import { IWorkspaceState } from '../state/IWorkspaceState';
import { hasEditableSignature, isUserProcess } from '../services/ProcessFunctions';
import { removeStep } from './removeStep';
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

    let newState = {
        ...state,
        processes,
    }

    // Remove all steps in other processes that reference the removed process.
    // Do this in two steps, to avoid updating the process list as we loop through it.

    const stepsToRemove = [];

    for (const process of processes) {
        if (isUserProcess(process)) {
            for (const step of process.steps) {
                if (isProcessStep(step) && step.process === deleteProcess) {
                    stepsToRemove.push({
                        processName: process.name,
                        stepId: step.uniqueId,
                    })
                }
            }
        }
    }

    for (const stepToRemove of stepsToRemove) {
        newState = removeStep(newState, stepToRemove);
    }

    return newState;
}