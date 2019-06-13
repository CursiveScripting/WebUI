import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';
import { Parameter } from './Parameter';

export class StartStep extends Step {
    constructor(uniqueID: string, parentProcess: UserProcess, x: number, y: number) {
        super(uniqueID, StepType.Start, parentProcess, x, y);
        this.outputs = this.copyParameters(parentProcess.inputs, false);
    }

    public get name() { return 'Start'; }
    public get description() { return this.outputs.length === 0 ? 'Begins this process' : 'Begins this process and gets its inputs'; }
    public get inputs () { return []; }
    public readonly outputs: Parameter[];
    public get returnPathNames() { return []; }
}