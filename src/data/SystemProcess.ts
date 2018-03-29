import { Parameter } from './Parameter';
import { Process } from './Process';

export class SystemProcess extends Process {
    constructor(
        name: string,
        inputs: Parameter[],
        outputs: Parameter[],
        returnPaths: string[],
        description: string,
        folder: string | null,
    ) {
        super(name, inputs, outputs, returnPaths, false, description, folder);
    }
}