import { IParameter } from './IParameter';
import { IPositionable } from './IPositionable';

export interface IVariable extends IPositionable, IParameter {
    fromLinks: IParameter[];
    toLinks: IParameter[];
    initialValue: string | null;
}