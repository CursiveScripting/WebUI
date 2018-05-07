import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';

export class StartStep extends Step {
    constructor(uniqueID: string, parentProcess: UserProcess, x: number, y: number) {
        super(uniqueID, StepType.Start, parentProcess, x, y);
    }

    public get name() { return 'Start'; }
    public get inputs () { return []; }
    public get outputs () { return this.parentProcess.inputs; }
    public get returnPathNames() { return []; }

    // TODO: quite a lot
}