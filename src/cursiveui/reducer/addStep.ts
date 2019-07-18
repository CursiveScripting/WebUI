import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { determineStepId } from '../services/StepFunctions';
import { StepType } from '../state/IStep';
import { IProcessStep } from '../state/IProcessStep';

export type AddStepAction = {
    type: 'add step';
    inProcessName: string;
    stepProcessName: string;
    x: number;
    y: number;
}

export function addStep(state: IWorkspaceState, action: AddStepAction) {
    const inProcessIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    if (inProcessIndex === -1) {
        return state;
    }

    const inProcess = { ...state.processes[inProcessIndex] };
    
    if (!isUserProcess(inProcess)) {
        return state;
    }

    const stepProcess = state.processes.find(p => p.name === action.stepProcessName);
    if (stepProcess === undefined) {
        return state; // invalid process
    }

    inProcess.steps = [...inProcess.steps, {
        uniqueId: determineStepId(inProcess.steps),
        processName: action.stepProcessName,
        inputs: {},
        outputs: {},
        returnPaths: {},
        stepType: stepProcess.isSystem
            ? StepType.SystemProcess
            : StepType.UserProcess,
        x: action.x,
        y: action.y,
    } as IProcessStep];

    const processes = state.processes.slice();
    processes[inProcessIndex] = inProcess;
    
    const errors = { ...state.errors };
    errors[inProcess.name] = [...errors[inProcess.name]]; // TODO: add error for unconnected step

    return {
        ...state,
        processes,
        errors,
    };
}