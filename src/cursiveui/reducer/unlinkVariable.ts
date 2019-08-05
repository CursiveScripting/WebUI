import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { usesOutputs, usesInputs } from '../services/StepFunctions';
import { validate } from './validate';

export type UnlinkVariableAction = {
    type: 'unlink variable';
    inProcessName: string;
    varName: string;
    varInput: boolean;
}

export function unlinkVariable(state: IWorkspaceState, action: UnlinkVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    process.variables = process.variables.slice();

    const varIndex = process.variables.findIndex(v => v.name === action.varName);

    const oldVariable = process.variables[varIndex];

    const newVariable = {
        ...oldVariable,
    }

    if (action.varInput) {
        newVariable.incomingLinks = [];
    }
    else {
        newVariable.outgoingLinks = [];
    }

    if (action.varInput) {
        process.steps = process.steps.map(step => {
            let anyChanged = false;
            const modifiedStep = {
                ...step,
            };

            if (usesInputs(modifiedStep)) {
                modifiedStep.inputs = modifiedStep.inputs.map(step => {
                    if (step.connection === oldVariable) {
                        anyChanged = true;
                        return {
                            ...step,
                            connection: newVariable,
                        };
                    }

                    return step;
                })
            }

            if (usesOutputs(modifiedStep)) {
                modifiedStep.outputs = modifiedStep.outputs.map(step => {
                    if (step.connection === oldVariable) {
                        anyChanged = true;
                        return {
                            ...step,
                            connection: undefined,
                        };
                    }

                    return step;
                })
            }

            return anyChanged
                ? modifiedStep
                : step;
        });
    }
    else {
        process.steps = process.steps.map(step => {
            let anyChanged = false;
            const modifiedStep = {
                ...step,
            };

            if (usesInputs(modifiedStep)) {
                modifiedStep.inputs = modifiedStep.inputs.map(step => {
                    if (step.connection === oldVariable) {
                        anyChanged = true;
                        return {
                            ...step,
                            connection: undefined,
                        };
                    }

                    return step;
                })
            }

            if (usesOutputs(modifiedStep)) {
                modifiedStep.outputs = modifiedStep.outputs.map(step => {
                    if (step.connection === oldVariable) {
                        anyChanged = true;
                        return {
                            ...step,
                            connection: newVariable,
                        };
                    }

                    return step;
                })
            }
            
            return anyChanged
                ? modifiedStep
                : step;
        });
    }

    const processes = state.processes.slice();
    processes[processIndex] = process;
    
    process.errors = validate(process, processes);
    
    return {
        ...state,
        processes,
    }
}