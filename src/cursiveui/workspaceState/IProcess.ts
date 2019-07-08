import { IParameter } from './IParameter';

export interface IProcess {
    name: string;

    inputs: IParameter[];

    outputs: IParameter[];

    returnPaths: string[];

    description: string;
    
    folder: string | null;

    isSystem: boolean;
}