import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';
import { Parameter } from './Parameter';
import { ValidationError } from './ValidationError';

export class StopStep extends Step {
    constructor(uniqueID: string, parentProcess: UserProcess, public returnPath: string | null, x: number, y: number) {
        super(uniqueID, StepType.Stop, parentProcess, x, y);
        this.inputs = this.copyParameters(parentProcess.outputs, true);
    }

    public get name() { return 'Stop'; }
    public get description() { return this.inputs.length === 0 ? 'Stops this process' : 'Stops this process and sets its outputs'; }
    public readonly inputs: Parameter[];
    public get outputs () { return []; }
    public get returnPathNames() { return null; }

    public validate() {
        let errors = super.validate();

        // ensure return path name is valid
        if (this.parentProcess.returnPaths === null) {
            if (this.returnPath !== null) {
                errors.push(new ValidationError(this, null, null, `Invalid return path name: ${this.returnPath}`));
            }
        }
        else {
            const numPaths = this.parentProcess.returnPaths.filter(pathName => pathName === this.returnPath).length;
            if (numPaths !== 1) {
                errors.push(new ValidationError(this, null, undefined, `Wrong number of return paths: got ${numPaths}, but expected 1`));
            }
        }

        this._isValid = errors.length === 0;
        return errors;
    }
}