import { Parameter } from './Parameter';
import { ReturnPath } from './ReturnPath';
import { UserProcess } from './UserProcess';
import { Positionable } from './Positionable';

export enum StepType {
    Start,
    Stop,
    SystemProcess,
    UserProcess,
}

export abstract class Step implements Positionable {
    public incomingPaths: ReturnPath[] = [];
    public returnPaths: ReturnPath[] = [];
    public get isValid() { return this._isValid; }
    protected _isValid: boolean;

    constructor(
        public readonly uniqueID: string,
        public readonly stepType: StepType,
        readonly parentProcess: UserProcess,
        public x: number,
        public y: number
    ) {
        this._isValid = false;
    }

    public abstract get name(): string;
    public abstract get inputs(): Parameter[];
    public abstract get outputs(): Parameter[];
    public abstract get returnPathNames(): string[] | null;

    public validate() {
        let valid = true;

        if (!this.validateReturnPaths()) {
            valid = false;
        }

        if (this.incomingPaths.length === 0 && this.stepType !== StepType.Start) {
            valid = false; // every step should be connected to something before it
        }

        // all input connectors and output connectors should be connected
        for (let input of this.inputs) {
            input.isValid = input.link !== null || input.initialValue !== null;
            if (!input.isValid) {
                valid = false;
            }
        }

        for (let output of this.outputs) {
            output.isValid = output.link !== null;
            if (!output.isValid) {
                valid = false;
            }
        }

        this._isValid = valid;
        return valid;
    }

    protected copyParameters(params: Parameter[]) {
        return params.map(param => new Parameter(param.name, param.type));
    }

    private validateReturnPaths() {
        // should have exactly 1 return path, with a null name
        if (this.returnPathNames === null) {
            if (this.returnPaths.length !== 1) {
                return false;
            }

            if (this.returnPaths[0].name !== null) {
                return false; // definition must have changed, this shouldn't happen
            }

            return true;
        }

        for (let pathName of this.returnPathNames) {
            // every return path name should have a path
            if (this.returnPaths.filter(p => p.name === pathName).length !== 1) {
                return false;
            }
        }

        for (let path of this.returnPaths) {
            if (this.returnPathNames.filter(pathName => pathName === path.name).length !== 1) {
                return false; // definition must have changed, this shouldn't happen
            }
        }

        return true;
    }
}