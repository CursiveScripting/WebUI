namespace Cursive {
    export abstract class Process {
        editor: ProcessEditor;
        constructor(readonly name: string, readonly inputs: Variable[], readonly outputs: Variable[], readonly returnPaths: string[]) { }

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
        constructor(name, inputs, outputs, returnPaths) {
            super(name, inputs, outputs, returnPaths);
        }
    }

    export class UserProcess extends Process {
        steps: Step[];
        variables: Variable[];
        constructor(name, inputs, outputs, returnPaths, readonly fixedSignature: boolean) {
            super(name, inputs, outputs, returnPaths);
        
            this.steps = [];
            this.variables = [];
        }

        isValid() : boolean {
            // TODO: check if every step's outputs and I/O parameters are connected
            return true;
        }

        createDefaultSteps() {
            let step: Step = new StartStep(this, 75, 125);
            step.createDanglingReturnPaths();
            this.steps.push(step);
        }
    }
}