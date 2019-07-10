import { IProcess } from './IProcess';
import { IType } from './IType';

export interface IWorkspaceState {
    types: Record<string, IType>;
    processes: IProcess[];
}