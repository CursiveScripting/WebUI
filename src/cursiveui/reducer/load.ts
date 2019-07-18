import { IType } from '../state/IType';
import { IProcess } from '../state/IProcess';
import { ValidationError } from '../state/IValidationError';

export type LoadAction = {
    type: 'load';
    types: IType[];
    processes: IProcess[];
    errors: Record<string, ValidationError[]>;
}

export function load(action: LoadAction) {
    return {
        types: action.types,
        processes: action.processes,
        errors: action.errors,
    };
}