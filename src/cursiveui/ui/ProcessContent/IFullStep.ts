import { IStep } from '../../workspaceState/IStep';
import { IType } from '../../workspaceState/IType';

export interface IFullStep extends IStep {
    name: string;
    description?: string;
    
    inputParams: { name: string, type: IType }[];
    outputParams: { name: string, type: IType }[];
    returnPathNames: string[];
}