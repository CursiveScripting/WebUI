import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { replaceVariableReferences } from '../services/StepFunctions';

export type MoveVariableAction = {
    type: 'move variable';
    inProcessName: string;
    varName: string;
    x: number;
    y: number;
}

export function moveVariable(state: IWorkspaceState, action: MoveVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    let process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    const varIndex = process.variables.findIndex(v => v.name === action.varName);

    if (varIndex === -1) {
        return state;
    }

    const oldVariable = process.variables[varIndex];
    const newVariable = { ...oldVariable, x: action.x, y: action.y };

    process.variables = process.variables.slice();
    process.variables[varIndex] = newVariable;

    process = replaceVariableReferences(process, oldVariable, newVariable, newVariable);

    const processes = state.processes.slice();
    processes[processIndex] = process;

    return {
        ...state,
        processes,
    };
}