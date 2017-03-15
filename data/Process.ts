namespace Cursive {
    export abstract class Process {
        workspace: Workspace;
        constructor(public name: string, readonly inputs: Parameter[], readonly outputs: Parameter[], readonly returnPaths: string[], readonly isEditable: boolean) { }
        
        signatureMatches(other: Process) {
            if (this.inputs.length != other.inputs.length ||
                this.outputs.length != other.outputs.length ||
                this.returnPaths.length != other.returnPaths.length)
                return false;

            for (let i=0; i<this.inputs.length; i++) {
                let mine = this.inputs[i], theirs = other.inputs[i];
                if (mine.name != theirs.name || mine.type != theirs.type)
                    return false;
            }

            for (let i=0; i<this.outputs.length; i++) {
                let mine = this.outputs[i], theirs = other.outputs[i];
                if (mine.name != theirs.name || mine.type != theirs.type)
                    return false;
            }

            for (let i=0; i<this.returnPaths.length; i++) {
                if (this.returnPaths[i] != other.returnPaths[i])
                    return false;
            }

            return true;
        }
    }

    export class SystemProcess extends Process {
        constructor(name: string, inputs: Parameter[], outputs: Parameter[], returnPaths: string[]) {
            super(name, inputs, outputs, returnPaths, false);
        }
    }
}