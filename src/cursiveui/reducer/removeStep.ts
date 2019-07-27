import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';
import { usesOutputs, anyStepLinksTo } from '../services/StepFunctions';

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

    const removedStep = process.steps[stepIndex];

    process.steps.splice(stepIndex, 1);

    if (usesOutputs(removedStep)) {
        for (const path in removedStep.returnPaths) {
            const target = removedStep.returnPaths[path];
            
            if (!anyStepLinksTo(target, process.steps)) {
                target.inputConnected = false;
            }
        }
    }

    const processes = state.processes.slice();
    processes[processIndex] = process;

    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    };
}