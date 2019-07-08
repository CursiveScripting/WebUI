import { IPositionable } from './IPositionable';

export enum StepType {
    Start,
    Stop,
    SystemProcess,
    UserProcess,
}

export interface IStep extends IPositionable {
    /*
    public incomingPaths: ReturnPath[] = [];
    public returnPaths: ReturnPath[] = [];
    public get isValid() { return this._isValid; }
    protected _isValid: boolean;
*/

    uniqueId: string;
    stepType: StepType;

//    isValid: boolean; // TODO: keep this in the model here?

    
    /*
    public abstract get name(): string;
    public abstract get description(): string;
    public abstract get inputs(): Parameter[];
    public abstract get outputs(): Parameter[];
    public abstract get returnPathNames(): string[] | null;

    */
}

export interface IStepWithInputs extends IStep {
    inputs: Record<string, string>;
}

export interface IStepWithOutputs extends IStep {
    outputs: Record<string, string>;
    returnPaths: Record<string, string>;
}