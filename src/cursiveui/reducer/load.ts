import { IType } from '../state/IType';
import { IProcess } from '../state/IProcess';

export type LoadAction = {
    type: 'load';
    types: IType[];
    processes: IProcess[];
}

export function load(action: LoadAction) {
    return {
        types: action.types,
        processes: action.processes,
        errors: {},
    };
}