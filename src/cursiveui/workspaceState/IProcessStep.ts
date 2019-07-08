import { StepType, IStepWithInputs, IStepWithOutputs } from './IStep';

export interface IProcessStep extends IStepWithInputs, IStepWithOutputs {
    stepType: StepType.UserProcess | StepType.SystemProcess;
    processName: string;
}