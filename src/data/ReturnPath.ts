import { Step } from './Step';

export class ReturnPath {
    constructor (readonly fromStep: Step, readonly toStep: Step, readonly name: string | null) {
        
    }
}