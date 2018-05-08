import { Parameter } from './Parameter';
import { ReturnPath } from './ReturnPath';
import { UserProcess } from './UserProcess';

export enum StepType {
    Start,
    Stop,
    SystemProcess,
    UserProcess,
}

export abstract class Step {
    public incomingPaths: ReturnPath[] = [];
    public returnPaths: ReturnPath[] = [];

    constructor(
        public readonly uniqueID: string,
        public readonly stepType: StepType,
        readonly parentProcess: UserProcess,
        public x: number,
        public y: number
    ) {
        /*
        this.drawText = this.dragging = false;
        this.createRegions();
        */
    }

    public abstract get name(): string;
    public abstract get inputs(): Parameter[];
    public abstract get outputs(): Parameter[];
    public abstract get returnPathNames(): string[] | null;

    public validate() {
        // TODO: quite a lot
        return true;
    }

    protected copyParameters(params: Parameter[]) {
        return params.map(param => new Parameter(param.name, param.type));
    }
}