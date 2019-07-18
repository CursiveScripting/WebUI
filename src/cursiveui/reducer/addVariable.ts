import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { IVariable } from '../state/IVariable';

export type AddVariableAction = {
    type: 'add variable';
    inProcessName: string;
    typeName: string;
    varName: string;
    x: number;
    y: number;
}

export function addVariable(state: IWorkspaceState, action: AddVariableAction) {
    const typeIndex = state.types.findIndex(t => t.name === action.typeName);
    
    if (typeIndex === -1) {
        return state; // invalid type
    }

    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    process.variables = [...process.variables, {
        name: action.varName,
        typeName: action.typeName,
        fromLinks: [],
        toLinks: [],
        initialValue: null,
        x: action.x,
        y: action.y,
    } as IVariable];
    
    const processes = state.processes.slice();
    processes[processIndex] = process;

    return {
        ...state,
        processes,
    };
}