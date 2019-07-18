interface IValidationError {
    message: string;
}

interface IVariableValidationError extends IValidationError {
    varName: string;
}

interface IStepValidationError extends IValidationError {
    stepId: string;
}

interface IReturnPathValidationError extends IStepValidationError {
    returnPath: string | null;
}

interface IParameterValidationError extends IStepValidationError {
    paramName: string;
    isInput: boolean;
}

export type ValidationError = IVariableValidationError
| IStepValidationError
| IReturnPathValidationError
| IParameterValidationError