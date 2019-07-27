import { IType } from '../state/IType';
import { IProcess } from '../state/IProcess';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';

export type LoadAction = {
    type: 'load';
    types: IType[];
    processes: IProcess[];
}

export function load(action: LoadAction) {
    const state = {
        types: action.types,
        processes: action.processes,
    }

    for (const process of action.processes) {
        if (isUserProcess(process)) {
            process.errors = validate(process, action.processes);
        }
    }

    return state;
}