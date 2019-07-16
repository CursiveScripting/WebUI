import { IStep } from '../workspaceState/IStep';
import { IParameter } from '../workspaceState/IParameter';

export class ValidationError {
    constructor(
        public readonly step: IStep,
        public readonly parameter: IParameter | null,
        public readonly returnPath: string | null | undefined,
        public readonly message: string
    ) {

    }
}