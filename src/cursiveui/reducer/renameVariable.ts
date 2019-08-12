import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { replaceVariableReferences } from '../services/StepFunctions';

export type RenameVariableAction = {
    type: 'rename variable';
    inProcessName: string;
    oldName: string;
    newName: string;
}

export function renameVariable(state: IWorkspaceState, action: RenameVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    let process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    const varIndex = process.variables.findIndex(v => v.name === action.oldName);

    if (varIndex === -1) {
        return state;
    }

    const oldVariable = process.variables[varIndex];

    if (oldVariable.name === action.newName) {
        return state;
    }

    if (process.variables.find(v => v.name === action.newName) !== undefined) {
        return state; // another variable uses this name
    }

    const newVariable = { ...oldVariable, name: action.newName };

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