import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';

export type SetVariableAction = {
    type: 'set variable';
    inProcessName: string;
    varName: string;
    initialValue: string | null;
}

export function setVariable(state: IWorkspaceState, action: SetVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }
    
    const varIndex = process.variables.findIndex(v => v.name === action.varName);

    if (varIndex === -1) {
        return state;
    }

    const variables = [ ...process.variables ];

    variables[varIndex] = {
        ...process.variables[varIndex],
        initialValue: action.initialValue,
    };

    process.variables = variables;
    
    const processes = state.processes.slice();
    processes[processIndex] = process;

    const errors = { ...state.errors };
    const processErrors = [...errors[process.name]];
    errors[process.name] = processErrors; // TODO: reconsider this process's errors

    return {
        ...state,
        processes,
    }
}