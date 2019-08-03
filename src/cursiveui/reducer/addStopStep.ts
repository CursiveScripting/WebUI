import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { determineStepId } from '../services/StepFunctions';
import { StepType } from '../state/IStep';
import { IStopStep } from '../state/IStopStep';
import { validate } from './validate';

export type AddStopStepAction = {
    type: 'add stop step';
    inProcessName: string;
    returnPath: string | null;
    x: number;
    y: number;
}

export function addStopStep(state: IWorkspaceState, action: AddStopStepAction) {
    const inProcessIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    if (inProcessIndex === -1) {
        return state;
    }

    const inProcess = { ...state.processes[inProcessIndex] };
    
    if (!isUserProcess(inProcess)) {
        return state;
    }

    if (action.returnPath === null && inProcess.returnPaths.length > 0) {
        return state; // need to specify a path name
    }
    
    if (action.returnPath !== null && inProcess.returnPaths.indexOf(action.returnPath) === -1) {
        return state; // invalid path name, or shouldn't have specified a path name
    }

    inProcess.steps = [...inProcess.steps, {
        uniqueId: determineStepId(inProcess.steps),
        returnPath: action.returnPath,
        inputs: inProcess.outputs.map(o => { return { ...o }; }),
        stepType: StepType.Stop,
        x: action.x,
        y: action.y,
        inputConnected: false,
    } as IStopStep];

    const processes = state.processes.slice();
    processes[inProcessIndex] = inProcess;
    
    inProcess.errors = validate(inProcess, processes);

    return {
        ...state,
        processes,
    };
}