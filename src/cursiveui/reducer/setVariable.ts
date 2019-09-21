import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';
import { replaceVariableReferences } from '../services/StepFunctions';

export type SetVariableAction = {
    type: 'set variable';
    inProcessName: string;
    varName: string;
    initialValue: string | null;
}

export function setVariable(state: IWorkspaceState, action: SetVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    let process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }
    
    const varIndex = process.variables.findIndex(v => v.name === action.varName);

    if (varIndex === -1) {
        return state;
    }

    const variables = [ ...process.variables ];

    const oldVariable = process.variables[varIndex];

    if (oldVariable.initialValue === action.initialValue) {
        return state;
    }

    const newVariable = {
        ...oldVariable,
        initialValue: action.initialValue,
    };
    
    variables[varIndex] = newVariable;

    process.variables = variables;
    
    process = replaceVariableReferences(process, oldVariable, newVariable, newVariable);

    const processes = state.processes.slice();
    processes[processIndex] = process;

    if (isUserProcess(process)) { // don't see why this type assertion is needed
        process.errors = validate(process, processes);
    }

    return {
        ...state,
        processes,
    }
}