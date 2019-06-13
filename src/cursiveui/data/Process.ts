import { Parameter } from './Parameter';

export abstract class Process {
    constructor(
        public name: string,
        readonly inputs: Parameter[],
        readonly outputs: Parameter[],
        readonly returnPaths: string[],
        public description: string,
        public folder: string | null
    ) { }

    public abstract get isSystem(): boolean;
    
    signatureMatches(other: Process) {
        if (this.inputs.length !== other.inputs.length ||
            this.outputs.length !== other.outputs.length ||
            this.returnPaths.length !== other.returnPaths.length) {
            return false;
        }

        for (let i = 0; i < this.inputs.length; i++) {
            let mine = this.inputs[i], theirs = other.inputs[i];
            if (mine.name !== theirs.name || mine.type !== theirs.type) {
                return false;
            }
        }

        for (let i = 0; i < this.outputs.length; i++) {
            let mine = this.outputs[i], theirs = other.outputs[i];
            if (mine.name !== theirs.name || mine.type !== theirs.type) {
                return false;
            }
        }

        for (let i = 0; i < this.returnPaths.length; i++) {
            if (this.returnPaths[i] !== other.returnPaths[i]) {
                return false;
            }
        }

        return true;
    }
}