import { IStep } from './IStep';
import { IStepParameter } from './IStepParameter';

interface IValidationError {
    message: string;
}

interface IStepValidationError extends IValidationError {
    step: IStep;
}

interface IReturnPathValidationError extends IStepValidationError {
    returnPath: string | null;
}

interface IParameterValidationError extends IStepValidationError {
    parameter: IStepParameter;
    isInput: boolean;
}

export type ValidationError = IStepValidationError
| IReturnPathValidationError
| IParameterValidationError

export function errorHasStep(error: ValidationError) : error is IStepValidationError {
    return (error as any).step !== undefined;
}

export function errorHasParameter(error: ValidationError) : error is IParameterValidationError {
    return (error as any).parameter !== undefined;
}

export function errorHasReturnPath(error: ValidationError) : error is IReturnPathValidationError {
    return (error as any).step !== undefined;
}