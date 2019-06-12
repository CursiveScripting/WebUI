import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';
import { Parameter } from './Parameter';

export class StartStep extends Step {
    private _outputs: Parameter[];

    constructor(uniqueID: string, parentProcess: UserProcess, x: number, y: number) {
        super(uniqueID, StepType.Start, parentProcess, x, y);
        this._outputs = this.copyParameters(parentProcess.inputs, false);
    }

    public get name() { return 'Start'; }
    public get inputs () { return []; }
    public get outputs () { return this._outputs; }
    public get returnPathNames() { return []; }
}