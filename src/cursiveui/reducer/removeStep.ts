import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';

export type RemoveStepAction = {
    type: 'remove step';
    processName: string;
    stepId: string;
}

export function removeStep(state: IWorkspaceState, action: RemoveStepAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.processName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }
    
    process.steps = process.steps.slice();

    const stepIndex = process.steps.findIndex(step => step.uniqueId === action.stepId);

    if (stepIndex === -1) {
        return state;
    }

    process.steps.splice(stepIndex, 1);

    const processes = state.processes.slice();
    processes[processIndex] = process;

    const errors = { ...state.errors };
    const processErrors = [...errors[process.name]];
    errors[process.name] = processErrors; // TODO: reconsider this process's errors

    return {
        ...state,
        processes,
        errors,
    };
}