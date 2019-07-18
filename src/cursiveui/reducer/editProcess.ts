import { IParameter } from '../state/IParameter';
import { IUserProcess } from '../state/IUserProcess';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { hasEditableSignature, isUserProcess } from '../services/ProcessFunctions';
import { isProcessStep, isStartStep, isStopStep } from '../services/StepFunctions';
import { mapRecordKeys } from '../services/DataFunctions';

export type EditProcessAction = {
    type: 'edit process';
    oldName: string;
    newName: string;
    description: string;
    folder: string | null;
    returnPaths: string[];
    inputs: IParameter[];
    outputs: IParameter[];
    mapInputs: (prev: string) => string | undefined;
    mapOutputs: (prev: string) => string | undefined;
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

    // Everything that references oldProcess should change to newProcess instead
    const processes = state.processes.map(process => {
        if (!isUserProcess(process)) {
            return process;
        }

        let changed = false;
        
        const copyProcess = {
            ...process,
            steps: process.steps.map(step => {
                if (!isProcessStep(step) || step.processName !== action.oldName) {
                    return step;
                }

                changed = true;
                
                // Strip out any return paths that are no longer valid
                const returnPaths: Record<string, string> = {};
                for (const path in step.returnPaths) {
                    if (action.returnPaths.indexOf(path) !== -1) {
                        returnPaths[path] = step.returnPaths[path];
                    }
                }

                return {
                    ...step,
                    processName: action.newName,
                    inputs: mapRecordKeys(step.inputs, action.mapInputs),
                    outputs: mapRecordKeys(step.outputs, action.mapOutputs),
                    returnPaths,
                }
            }),
        };

        return changed
            ? copyProcess
            : process;
    });

    // Also update the i/o of process's own start and stop steps
    const steps = oldProcess.steps.map(s => {
        if (isStartStep(s)) {
            return {
                ...s,
                outputs: mapRecordKeys(s.outputs, action.mapInputs),
            }
        }
        
        if (isStopStep(s)) {
            // Stop steps with invalid return paths will be left, and will fail to validate
            return {
                ...s,
                outputs: mapRecordKeys(s.inputs, action.mapOutputs),
            }
        }
        
        return s;
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

    processes[index] = newProcess;

    return {
        ...state,
        processes,
    };
}