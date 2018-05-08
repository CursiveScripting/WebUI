import { Process } from './Process';
import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';
import { Parameter } from './Parameter';

export class ProcessStep extends Step {
    private _inputs: Parameter[];
    private _outputs: Parameter[];
    
    constructor(
        uniqueID: string,
        readonly process: Process,
        parentProcess: UserProcess,
        x: number,
        y: number
    ) {
        super(uniqueID, process.isEditable ? StepType.UserProcess : StepType.SystemProcess, parentProcess, x, y);
        
        this._inputs = this.copyParameters(parentProcess.inputs);       
        this._outputs = this.copyParameters(parentProcess.outputs);
    }

    public get name() { return this.process.name; }
    public get inputs () { return this._inputs; }
    public get outputs () { return this._outputs; }
    public get returnPathNames() { return this.process.returnPaths; }

    public validate() {
        let isValid = super.validate();
        // TODO: quite a lot
        return isValid;
    }
}