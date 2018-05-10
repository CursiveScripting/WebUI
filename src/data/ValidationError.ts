import { Parameter } from './Parameter';
import { Step } from './Step';

export class ValidationError {
    constructor(public readonly step: Step, public readonly parameter: Parameter | null, public readonly message: string) {

    }
}