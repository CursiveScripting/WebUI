import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';

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
    
    const stepIndex = process.steps.findIndex(step => step.uniqueId === action.stepId);

    if (stepIndex === -1) {
        return state;
    }

    process.steps = process.steps.slice();
    process.steps[stepIndex] = { ...process.steps[stepIndex], x: action.x, y: action.y };

    const processes = state.processes.slice();
    processes[processIndex] = process;

    return {
        ...state,
        processes,
    };
}