import { Parameter } from './Parameter';
import { ReturnPath } from './ReturnPath';
import { UserProcess } from './UserProcess';
import { Positionable } from './Positionable';
import { ValidationError } from './ValidationError';

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
    public abstract get description(): string;
    public abstract get inputs(): Parameter[];
    public abstract get outputs(): Parameter[];
    public abstract get returnPathNames(): string[] | null;

    public setInvalid() { this._isValid = false; }

    public validate() {
        let errors: ValidationError[] = [];

        errors = this.validateReturnPaths();

        if (this.incomingPaths.length === 0 && this.stepType !== StepType.Start) {
            errors.push(new ValidationError(this, null, undefined, 'No connections lead to this step - it is unreachable'));
        }

        // all input connectors should be connected
        for (let input of this.inputs) {
            input.isValid = true;
            if (input.link !== null) {
                continue;
            }

            if (input.initialValue === null) {
                input.isValid = false;
                errors.push(new ValidationError(this, input, undefined, 'Input is not connected and has no default'));
            }

            else if (!input.type.isValid(input.initialValue)) {
                input.isValid = false;
                errors.push(new ValidationError(this, input, undefined, 'Input has invalid default'));
            }
        }

        this._isValid = errors.length === 0;
        return errors;
    }

    protected copyParameters(params: Parameter[], asInput: boolean) {
        return params.map(param => new Parameter(param.name, param.type, asInput));
    }

    private validateReturnPaths() {
        if (this.returnPathNames === null) {
            /*
            if (this.stepType === StepType.SystemProcess) {
                console.log('validating, path names are null');
            }
            */
            return [];
        }

        // should have exactly 1 return path, with a null name
        if (this.returnPathNames.length === 0) {
            if (this.returnPaths.length === 0) {
                return [new ValidationError(this, null, null, 'Return path is not connected')];
            } else if (this.returnPaths.length !== 1) {
                return [new ValidationError(this, null, null, 'Single-return path step (somehow) has multiple return paths')];
            }

            if (this.returnPaths[0].name !== null) {
                return [new ValidationError(this, null, null, 'Single-return path step (somehow) has a named return path')];
            }

            return [];
        }

        let errors: ValidationError[] = [];

        for (let pathName of this.returnPathNames) {
            // every return path name should have a path
            if (this.returnPaths.filter(p => p.name === pathName).length !== 1) {
                errors.push(new ValidationError(this, null, pathName, `'${pathName}' return path is not connected`));
            }
        }

        for (let path of this.returnPaths) {
            if (this.returnPathNames.filter(pathName => pathName === path.name).length !== 1) {
                errors.push(new ValidationError(this, null, undefined, `Return path has an invalid name: '${path.name}'`));
            }
        }

        return errors;
    }
}