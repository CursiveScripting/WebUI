import { IProcess } from './IProcess';

export interface ISystemProcess extends IProcess {
    isSystem: true;
}