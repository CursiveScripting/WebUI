import { IStepParameter } from './IStepParameter';
import { ICoord } from './dimensions';
import { IReturnPath } from './IReturnPath';

export enum StepType {
    Start,
    Stop,
    SystemProcess,
    UserProcess,
}

export interface IStep extends ICoord {
    uniqueId: string;
    stepType: StepType;
}

export interface IStepWithInputs extends IStep {
    inputs: IStepParameter[];
    inputConnected: boolean;
}

export interface IStepWithOutputs extends IStep {
    outputs: IStepParameter[];
    returnPaths: IReturnPath[];
}