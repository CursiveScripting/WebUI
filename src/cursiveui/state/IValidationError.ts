import { IStep } from './IStep';
import { IVariable } from './IVariable';
import { IStepParameter } from './IStepParameter';

interface IValidationError {
    message: string;
}

interface IVariableValidationError extends IValidationError {
    variable: IVariable;
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

export type ValidationError = IVariableValidationError
| IStepValidationError
| IReturnPathValidationError
| IParameterValidationError