import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { IVariable } from '../state/IVariable';
import { validate } from './validate';

export type AddVariableAction = {
    type: 'add variable';
    inProcessName: string;
    typeName: string;
    varName: string;
    x: number;
    y: number;
}

export function addVariable(state: IWorkspaceState, action: AddVariableAction) {
    const type = state.types.find(t => t.name === action.typeName);
    
    if (type === undefined) {
        return state; // invalid type
    }

    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    process.variables = [...process.variables, {
        name: action.varName,
        type: type,
        incomingLinks: [],
        outgoingLinks: [],
        initialValue: null,
        x: action.x,
        y: action.y,
    } as IVariable];
    
    const processes = state.processes.slice();
    processes[processIndex] = process;
    
    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    };
}