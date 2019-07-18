import { IPositionable } from './IPositionable';

export enum StepType {
    Start,
    Stop,
    SystemProcess,
    UserProcess,
}

export interface IStep extends IPositionable {
    uniqueId: string;
    stepType: StepType;
}

export interface IStepWithInputs extends IStep {
    inputs: Record<string, string>;
}

export interface IStepWithOutputs extends IStep {
    outputs: Record<string, string>;
    returnPaths: Record<string, string>;
}