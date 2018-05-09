import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';
import { Parameter } from './Parameter';

export class StopStep extends Step {
    private _inputs: Parameter[];

    constructor(uniqueID: string, parentProcess: UserProcess, public returnPath: string | null, x: number, y: number) {
        super(uniqueID, StepType.Stop, parentProcess, x, y);
        this._inputs = this.copyParameters(parentProcess.outputs);
    }

    public get name() { return 'Stop'; }
    public get inputs () { return this._inputs; }
    public get outputs () { return []; }
    public get returnPathNames() { return null; }

    public validate() {
        let isValid = super.validate();

        if (isValid) {
            // ensure return path name is valid
            if (this.parentProcess.returnPaths === null) {
                if (this.returnPath !== null) {
                    isValid = false; // definition must have changed, this shouldn't happen
                }
            }
            else {
                if (this.parentProcess.returnPaths.filter(pathName => pathName === this.returnPath).length !== 1) {
                    isValid = false; // definition must have changed, this shouldn't happen
                }
            }
        }

        this._isValid = true;
        return isValid;
    }
}