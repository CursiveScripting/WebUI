import { IStepWithInputs } from './IStep';

export interface IReturnPath {
    name: string | null;
    connection?: IStepWithInputs;
}