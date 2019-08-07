import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { replaceVariableReferences } from '../services/StepFunctions';
import { validate } from './validate';
import { IUserProcess } from '../state/IUserProcess';

export type UnlinkVariableAction = {
    type: 'unlink variable';
    inProcessName: string;
    varName: string;
    varInput: boolean;
}

export function unlinkVariable(state: IWorkspaceState, action: UnlinkVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    let process = { ...state.processes[processIndex] } as IUserProcess;

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
        if (oldVariable.incomingLinks.length === 0) {
            return state; // no change
        }

        newVariable.incomingLinks = [];
    }
    else {
        if (oldVariable.outgoingLinks.length === 0) {
            return state; // no change
        }

        newVariable.outgoingLinks = [];
    }

    process = action.varInput
        ? replaceVariableReferences(process, oldVariable, newVariable, undefined)
        : replaceVariableReferences(process, oldVariable, undefined, newVariable);

    const processes = state.processes.slice();
    processes[processIndex] = process;
    
    process.errors = validate(process, processes);
    
    return {
        ...state,
        processes,
    }
}