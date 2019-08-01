import { IProcess } from './IProcess';
import { IStep } from './IStep';
import { IVariable } from './IVariable';
import { IValidationError } from './IValidationError';

export interface IUserProcess extends IProcess {
    steps: IStep[];

    variables: IVariable[];

    fixedSignature: boolean;

    isSystem: false;
    
    errors: IValidationError[];
}