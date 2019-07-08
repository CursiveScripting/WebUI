import { Parameter } from './Parameter';
import { IStep } from '../workspaceState/IStep';

export class ValidationError {
    constructor(
        public readonly step: IStep,
        public readonly parameter: Parameter | null,
        public readonly returnPath: string | null | undefined,
        public readonly message: string
    ) {

    }
}