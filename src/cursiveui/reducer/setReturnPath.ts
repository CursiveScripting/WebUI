import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { usesOutputs, usesInputs, anyStepLinksTo } from '../services/StepFunctions';
import { validate } from './validate';

export type SetReturnPathAction = {
    type: 'set return path';
    inProcessName: string;
    fromStepId: string;
    toStepId?: string;
    pathName: string | null;
}

export function setReturnPath(state: IWorkspaceState, action: SetReturnPathAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    process.steps = process.steps.slice();

    const fromStepIndex = process.steps.findIndex(step => step.uniqueId === action.fromStepId);

    if (fromStepIndex === -1
        || (action.toStepId !== undefined && process.steps.findIndex(step => step.uniqueId === action.toStepId) === -1)) {
        return state;
    }

    const fromStep = { ...process.steps[fromStepIndex] };

    if (!usesOutputs(fromStep)) {
        return state;
    }

    process.steps[fromStepIndex] = fromStep;

    fromStep.returnPaths = { ...fromStep.returnPaths };

    const pathNameProperty = action.pathName === null
        ? ''
        : action.pathName;

    const oldDestination = fromStep.returnPaths[pathNameProperty];
    
    if (action.toStepId === undefined) {
        delete fromStep.returnPaths[pathNameProperty];
    }
    else {
        const toStep = process.steps.find(step => step.uniqueId === action.toStepId);
        if (toStep === undefined || !usesInputs(toStep)) {
            return state;
        }

        fromStep.returnPaths[pathNameProperty] = toStep;
        toStep.inputConnected = true;
    }

    if (oldDestination !== undefined && !anyStepLinksTo(oldDestination, process.steps)) {
        oldDestination.inputConnected = false;
    }
    
    const processes = state.processes.slice();
    processes[processIndex] = process;

    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    };
}