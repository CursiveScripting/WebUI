import { StepType, IStepWithInputs, IStepWithOutputs } from './IStep';
import { IProcess } from './IProcess';

export interface IProcessStep extends IStepWithInputs, IStepWithOutputs {
    stepType: StepType.UserProcess | StepType.SystemProcess;
    process: IProcess;
}