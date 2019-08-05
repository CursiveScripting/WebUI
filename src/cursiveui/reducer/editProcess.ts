import { IParameter } from '../state/IParameter';
import { IUserProcess } from '../state/IUserProcess';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { hasEditableSignature, isUserProcess } from '../services/ProcessFunctions';
import { isProcessStep, isStartStep, isStopStep } from '../services/StepFunctions';
import { validate } from './validate';
import { IStepParameter } from '../state/IStepParameter';
import { IReturnPath } from '../state/IReturnPath';

export type EditProcessAction = {
    type: 'edit process';
    oldName: string;
    newName: string;
    description: string;
    folder: string | null;
    returnPaths: string[];
    inputs: IParameter[];
    outputs: IParameter[];
    inputOrderMap: Array<number | undefined>; // Used for mapping variable connections. Array index is for the new parameter,
    outputOrderMap: Array<number | undefined>; // value is of the old parameter to get the variable connection from.
}

function mapParameters(oldParams: IStepParameter[], newSource: IParameter[], orderMap: Array<number | undefined>) {
    return newSource.map((param, index) => {
        const oldParamIndex = orderMap[index];

        return {
            name: param.name,
            type: param.type,
            connection: oldParamIndex === undefined
                ? undefined
                : oldParams[oldParamIndex].connection,
        };
    });
}

export function editProcess(state: IWorkspaceState, action: EditProcessAction) {
    const index = state.processes.findIndex(p => p.name === action.oldName);

    if (index === -1) {
        return state;
    }

    const oldProcess = state.processes[index];

    if (!hasEditableSignature(oldProcess)) {
        return state;
    }

    // update the i/o of process's own start and stop steps
    const steps = oldProcess.steps.map(step => {
        if (isStartStep(step)) {
            return {
                ...step,
                outputs: mapParameters(step.outputs, action.inputs, action.inputOrderMap),
            }
        }

        // TODO: we'll also have to un-link any variables here
        
        if (isStopStep(step)) {
            // Stop steps with invalid return paths will be left, and will fail to validate
            return {
                ...step,
                outputs: mapParameters(step.inputs, action.outputs, action.outputOrderMap),
            }
        }

        // TODO: we'll also have to un-link any variables here

        return step;
    })

    const newProcess: IUserProcess = {
        ...oldProcess,
        name: action.newName,
        description: action.description,
        folder: action.folder,
        inputs: action.inputs,
        outputs: action.outputs,
        returnPaths: action.returnPaths,
        steps,
    };

    // Everything that references oldProcess should change to newProcess instead
    const processes = state.processes.map(process => {
        if (process === oldProcess) {
            return newProcess;
        }

        if (!isUserProcess(process)) {
            return process;
        }

        let changed = false;
        
        const copyProcess = {
            ...process,
            steps: process.steps.map(step => {
                if (!isProcessStep(step) || step.process !== oldProcess) {
                    return step;
                }

                changed = true;
                
                // Strip out any return paths that are no longer valid
                const returnPaths: IReturnPath[] = action.returnPaths.map(name => {
                    const existingPath = step.returnPaths.find(p => p.name === name);

                    return existingPath !== undefined
                        ? existingPath
                        : { name };
                });

                // TODO: unset inputConnected on any step a removed return path connected to

                // TODO: actually just use the 'set return path' action?

                return {
                    ...step,
                    processName: action.newName,
                    inputs: mapParameters(step.inputs, action.inputs, action.inputOrderMap),
                    outputs: mapParameters(step.outputs, action.outputs, action.outputOrderMap),
                    returnPaths,
                }
            }),
        };

        return changed
            ? copyProcess
            : process;
    });

    for (const process of processes) {
        if (isUserProcess(process)) {
            process.errors = validate(process, processes)
        }
    }

    return {
        ...state,
        processes,
    };
}