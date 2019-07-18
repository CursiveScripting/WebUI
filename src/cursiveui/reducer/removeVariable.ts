import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';

export type RemoveVariableAction = {
    type: 'remove variable';
    inProcessName: string;
    varName: string;
}

export function removeVariable(state: IWorkspaceState, action: RemoveVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    const varIndex = process.variables.findIndex(v => v.name === action.varName);

    if (varIndex === -1) {
        return state;
    }

    process.variables = process.variables.slice();
    process.variables.splice(varIndex, 1);

    const processes = state.processes.slice();
    processes[processIndex] = process;

    const errors = { ...state.errors };
    const processErrors = [...errors[process.name]];
    errors[process.name] = processErrors; // TODO: reconsider this process's errors

    return {
        ...state,
        processes,
        errors,
    };
}