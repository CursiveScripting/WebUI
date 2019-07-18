import { IStep } from '../state/IStep';
import { IParameter } from '../state/IParameter';

export class ValidationError {
    constructor(
        public readonly step: IStep,
        public readonly parameter: IParameter | null,
        public readonly returnPath: string | null | undefined,
        public readonly message: string
    ) {

    }
}