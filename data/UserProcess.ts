﻿namespace Cursive {
    export class UserProcess extends Process {
        steps: Step[];
        variables: Variable[];
        private valid: boolean;
        private nextStepID: number;
        constructor(name, inputs, outputs, variables, returnPaths, readonly fixedSignature: boolean) {
            super(name, inputs, outputs, returnPaths);
        
            this.steps = [];
            this.variables = variables;
            this.valid = false;
            this.nextStepID = 1;
        }

        get isValid(): boolean {
            return this.valid;
        }

        getNextStepID() {
            return this.nextStepID++;
        }

        validate() : boolean {
            let valid = true;
            for (let step of this.steps)
                if (!step.validate()) {
                    valid = false;
                    break;
                }

            // TODO: any other validation rules? e.g. All stop steps must have a return path or not
            
            this.valid = valid;
            return valid;
        }

        createDefaultSteps() {
            let step: Step = new StartStep(this.getNextStepID(), this, 75, 125);
            step.createDanglingReturnPaths();
            this.steps.push(step);
        }
    }
}