import { IVariable } from './IVariable';
import { IStepParameter } from './IStepParameter';
import { ICoord } from './dimensions';

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
}

export interface IStepWithOutputs extends IStep {
    outputs: IStepParameter[];
    returnPaths: Record<string, IStepWithInputs>;
}