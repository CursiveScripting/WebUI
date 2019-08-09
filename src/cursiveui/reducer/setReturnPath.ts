import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { usesOutputs, usesInputs, anyStepLinksTo, replaceStep } from '../services/StepFunctions';
import { validate } from './validate';

type SetReturnPathBase = {
    inProcessName: string;
    fromStepId: string;
    toStepId?: string;
    pathName: string | null;
}

export type SetReturnPathAction = {
    type: 'set return path';
} & SetReturnPathBase;

export function setReturnPath(state: IWorkspaceState, action: SetReturnPathBase) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    const oldFromStep = process.steps.find(step => step.uniqueId === action.fromStepId);

    if (oldFromStep === undefined || !usesOutputs(oldFromStep)) {
        return state;
    }
    
    if (oldFromStep === undefined
        || (action.toStepId !== undefined && process.steps.findIndex(step => step.uniqueId === action.toStepId) === -1)) {
        return state;
    }

    const newFromStep = {
        ...oldFromStep,
    };
    
    process.steps = replaceStep(process.steps, oldFromStep, newFromStep);

    newFromStep.returnPaths = newFromStep.returnPaths.slice();

    const returnPathIndex = newFromStep.returnPaths.findIndex(p => p.name === action.pathName);
    const returnPath = { ...newFromStep.returnPaths[returnPathIndex] };
    newFromStep.returnPaths[returnPathIndex] = returnPath;
    
    const oldDestination = returnPath.connection;
    
    if (action.toStepId === undefined) {
        returnPath.connection = undefined;
    }
    else {
        const toStep = process.steps.find(step => step.uniqueId === action.toStepId);
        if (toStep === undefined || !usesInputs(toStep)) {
            return state;
        }

        returnPath.connection = toStep;
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