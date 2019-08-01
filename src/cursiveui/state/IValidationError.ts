import { IStep } from './IStep';
import { IStepParameter } from './IStepParameter';

export interface IValidationError {
    message: string;
    step: IStep;
    returnPath?: string | null;
    parameter?: IStepParameter;
}