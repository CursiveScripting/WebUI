import { IProcess } from './IProcess';
import { IType } from './IType';
import { ValidationError } from './IValidationError';

export interface IWorkspaceState {
    types: IType[];
    processes: IProcess[];
    errors: Record<string, ValidationError[]>;
}