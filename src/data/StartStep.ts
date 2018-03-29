import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';

export class StartStep extends Step {
    constructor(uniqueID: number, parentProcess: UserProcess, x: number, y: number) {
        super(uniqueID, StepType.Start, parentProcess, x, y);
    }

    public get name() { return 'Start'; }
    public get inputs () { return []; }
    public get outputs () { return this.parentProcess.inputs; }
    
    // TODO: quite a lot
}