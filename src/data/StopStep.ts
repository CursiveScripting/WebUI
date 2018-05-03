import { Step, StepType } from './Step';
import { UserProcess } from './UserProcess';

export class StopStep extends Step {
    constructor(uniqueID: number, parentProcess: UserProcess, public returnPath: string | null, x: number, y: number) {
        super(uniqueID, StepType.Stop, parentProcess, x, y);
        /*
        this.radius = 45;

        for (let connector of this.connectors)
            connector.calculateOffsets();
        */
    }

    public get name() { return 'Stop'; }
    public get inputs () { return this.parentProcess.outputs; }
    public get outputs () { return []; }
    public get returnPathNames() { return null; }

    public validate() {
        let isValid = super.validate();

        // TODO: quite a lot

        return isValid;
    }
}