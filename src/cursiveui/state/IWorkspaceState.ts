import { IProcess } from './IProcess';
import { DataType } from './IType';

export interface IWorkspaceState {
    types: DataType[];
    processes: IProcess[];
}