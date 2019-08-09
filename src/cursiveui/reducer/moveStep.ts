import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { replaceStep } from '../services/StepFunctions';

export type MoveStepAction = {
    type: 'move step';
    inProcessName: string;
    stepId: string;
    x: number;
    y: number;
}

export function moveStep(state: IWorkspaceState, action: MoveStepAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }
    
    const oldStep = process.steps.find(step => step.uniqueId === action.stepId);

    if (oldStep === undefined) {
        return state;
    }

    if (oldStep.x === action.x && oldStep.y === action.y) {
        return state;
    }

    const newStep = {
        ...oldStep,
        x: action.x,
        y: action.y,
    };

    process.steps = replaceStep(process.steps, oldStep, newStep);

    const processes = state.processes.slice();
    processes[processIndex] = process;

    return {
        ...state,
        processes,
    };
}