import { Process } from './Process';
import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';
import { Parameter } from './Parameter';

export class ProcessStep extends Step {
    
    constructor(
        uniqueID: string,
        readonly process: Process,
        parentProcess: UserProcess,
        x: number,
        y: number
    ) {
        super(uniqueID, process.isSystem ? StepType.SystemProcess : StepType.UserProcess, parentProcess, x, y);
        
        this.inputs = this.copyParameters(process.inputs, true);       
        this.outputs = this.copyParameters(process.outputs, false);
    }

    public get name() { return this.process.name; }
    public get description() { return this.process.description; }
    public readonly inputs: Parameter[];
    public readonly outputs: Parameter[];
    public get returnPathNames() { return this.process.returnPaths; }

    public validate() {
        let isValid = super.validate();
        // TODO: quite a lot
        return isValid;
    }
}