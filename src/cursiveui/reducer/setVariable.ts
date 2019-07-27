import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';

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

    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    }
}