import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';

export type MoveVariableAction = {
    type: 'move variable';
    inProcessName: string;
    varName: string;
    x: number;
    y: number;
}

export function moveVariable(state: IWorkspaceState, action: MoveVariableAction) {
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
    process.variables[varIndex] = { ...process.variables[varIndex], x: action.x, y: action.y };

    const processes = state.processes.slice();
    processes[processIndex] = process;

    return {
        ...state,
        processes,
    };
}