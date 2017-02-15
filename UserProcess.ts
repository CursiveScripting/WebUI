namespace Cursive {
    export class UserProcess extends Process {
        steps: Step[];
        variables: Variable[];
        private valid: boolean;
        constructor(name, inputs, outputs, returnPaths, readonly fixedSignature: boolean) {
            super(name, inputs, outputs, returnPaths);
        
            this.steps = [];
            this.variables = [];
            this.valid = false;
        }

        get isValid(): boolean {
            return this.valid;
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
            let step: Step = new StartStep(this, 75, 125);
            step.createDanglingReturnPaths();
            this.steps.push(step);
        }
    }
}