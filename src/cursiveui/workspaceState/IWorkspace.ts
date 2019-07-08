import { Type } from '../data';
import { IProcess } from './IProcess';

export interface IWorkspace {
    types: Type[];
    processes: IProcess[];
}