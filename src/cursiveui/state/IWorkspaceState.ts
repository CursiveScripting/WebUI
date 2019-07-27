import { IProcess } from './IProcess';
import { IType } from './IType';

export interface IWorkspaceState {
    types: IType[];
    processes: IProcess[];
}