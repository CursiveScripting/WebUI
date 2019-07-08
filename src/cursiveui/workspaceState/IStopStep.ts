import { StepType, IStepWithInputs } from './IStep';

export interface IStopStep extends IStepWithInputs {
    stepType: StepType.Stop;
    returnPath: string | null;
}