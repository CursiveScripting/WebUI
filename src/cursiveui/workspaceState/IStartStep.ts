import { StepType, IStepWithOutputs } from './IStep';

export interface IStartStep extends IStepWithOutputs {
    stepType: StepType.Start;
}