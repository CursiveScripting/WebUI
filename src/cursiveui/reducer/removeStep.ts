import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';
import { usesOutputs, anyStepLinksTo, usesInputs } from '../services/StepFunctions';
import { IStepParameter } from '../state/IStepParameter';

type RemoveStepBase = {
    processName: string;
    stepId: string;
}

export type RemoveStepAction = {
    type: 'remove step';
} & RemoveStepBase

export function removeStep(state: IWorkspaceState, action: RemoveStepBase) {
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

    if (usesInputs(removedStep)) {
        process.steps = process.steps.map(unmodifiedStep => {
            const modifiedStep = { ...unmodifiedStep };
            let foundMatch = false;

            if (usesOutputs(modifiedStep)) {
                modifiedStep.returnPaths = modifiedStep.returnPaths.map(returnPath => {
                    if (returnPath.connection !== undefined && returnPath.connection === removedStep) {
                        foundMatch = true;
                        return {
                            ...returnPath,
                            connection: undefined,
                        };
                    }

                    return returnPath;
                });
            }

            return foundMatch
                ? modifiedStep
                : unmodifiedStep;
        });
    }

    let inParameters = usesInputs(removedStep)
        ? removedStep.inputs
        : [];

    let outParameters: IStepParameter[];

    if (usesOutputs(removedStep)) {
        outParameters = removedStep.outputs;

        for (const path of removedStep.returnPaths) {
            if (path.connection !== undefined && !anyStepLinksTo(path.connection, process.steps)) {
                path.connection.inputConnected = false;
            }
        }
    }
    else {
        outParameters = [];
    }

    process.variables = process.variables.map(variable => {
        return {
            ...variable,
            incomingLinks: variable.incomingLinks.filter(link => outParameters.indexOf(link) === -1),
            outgoingLinks: variable.outgoingLinks.filter(link => inParameters.indexOf(link) === -1),
        }
    });

    const processes = state.processes.slice();
    processes[processIndex] = process;

    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    };
}