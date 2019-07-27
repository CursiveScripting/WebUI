import { IParameter } from './IParameter';
import { IVariable } from './IVariable';

export interface IStepParameter extends IParameter {
    connection?: IVariable;
}