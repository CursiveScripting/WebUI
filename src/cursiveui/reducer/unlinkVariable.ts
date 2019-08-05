import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { mapStepParameters } from '../services/StepFunctions';
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

    process.variables = process.variables.slice();
    process.variables[varIndex] = newVariable;

    if (action.varInput) {
        newVariable.incomingLinks = [];
    }
    else {
        newVariable.outgoingLinks = [];
    }

    if (action.varInput) {
        process.steps = process.steps.map(step => {
            return mapStepParameters(
                step,
                param => param.connection !== undefined && param.connection.name === oldVariable.name, // TODO: try reference matching instead of name
                param => { return {
                    ...param,
                    connection: newVariable
                }},
                param => { return {
                    ...param,
                    connection: undefined
                }}
            );
        });
    }
    else {
        process.steps = process.steps.map(step => {
            return mapStepParameters(
                step,
                param => param.connection !== undefined && param.connection.name === oldVariable.name, // TODO: try reference matching instead of name
                param => { return {
                    ...param,
                    connection: undefined
                }},
                param => { return {
                    ...param,
                    connection: newVariable
                }}
            );
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