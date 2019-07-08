import { IProcess } from './IProcess';
import { IStep } from './IStep';
import { IVariable } from './IVariable';

export interface IUserProcess extends IProcess {
    steps: IStep[];

    variables: IVariable[];

    fixedSignature: boolean;

    isSystem: false;
}