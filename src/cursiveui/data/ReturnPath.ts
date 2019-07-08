import { IStep } from '../workspaceState/IStep';

export class ReturnPath {
    constructor (readonly fromStep: IStep, readonly toStep: IStep, readonly name: string | null) {
        
    }
}