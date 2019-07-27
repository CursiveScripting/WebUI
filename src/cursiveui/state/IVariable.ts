import { IParameter } from './IParameter';
import { IStepParameter } from './IStepParameter';
import { ICoord } from './dimensions';

export interface IVariable extends ICoord, IParameter {
    fromLinks: IStepParameter[];
    toLinks: IStepParameter[];
    initialValue: string | null;
}