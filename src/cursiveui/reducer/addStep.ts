import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { determineStepId } from '../services/StepFunctions';
import { StepType } from '../state/IStep';
import { IProcessStep } from '../state/IProcessStep';
import { validate } from './validate';

type AddStepBase = {
    inProcessName: string;
    stepProcessName: string;
    x: number;
    y: number;
}

export type AddStepAction = {
    type: 'add step';
} & AddStepBase

export function addStep(state: IWorkspaceState, action: AddStepBase) {
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
        process: stepProcess,
        inputs: stepProcess.inputs.map(i => { return { name: i.name, type: i.type }}),
        outputs: stepProcess.outputs.map(o => { return { name: o.name, type: o.type }}),
        returnPaths: stepProcess.returnPaths.length === 0
            ? [{ name: null }]
            : stepProcess.returnPaths.map(p => { return { name: p }}),
        stepType: stepProcess.isSystem
            ? StepType.SystemProcess
            : StepType.UserProcess,
        x: action.x,
        y: action.y,
        inputConnected: false,
    } as IProcessStep];

    const processes = state.processes.slice();
    processes[inProcessIndex] = inProcess;

    inProcess.errors = validate(inProcess, processes);

    return {
        ...state,
        processes,
    };
}