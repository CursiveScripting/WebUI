import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';

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

    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    };
}