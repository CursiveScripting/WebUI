import { Process } from './Process';

export class SystemProcess extends Process {
    public get isSystem() { return true; }
}