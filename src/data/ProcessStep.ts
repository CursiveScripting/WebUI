import { Process } from './Process';
import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';

export class ProcessStep extends Step {
    constructor(
        uniqueID: number,
        readonly process: Process,
        parentProcess: UserProcess,
        x: number,
        y: number
    ) {
        super(uniqueID, process.isEditable ? StepType.UserProcess : StepType.SystemProcess, parentProcess, x, y);
    }

    public get name() { return this.process.name; }
    public get inputs () { return this.process.inputs; }
    public get outputs () { return this.process.outputs; }
    public get returnPathNames() { return this.process.returnPaths; }

    public validate() {
        let isValid = super.validate();
        // TODO: quite a lot
        return isValid;
    }
}