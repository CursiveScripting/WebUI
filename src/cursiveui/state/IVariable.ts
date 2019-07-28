import { IParameter } from './IParameter';
import { IStepParameter } from './IStepParameter';
import { ICoord } from './dimensions';

export interface IVariable extends ICoord, IParameter {
    incomingLinks: IStepParameter[];
    outgoingLinks: IStepParameter[];
    initialValue: string | null;
}