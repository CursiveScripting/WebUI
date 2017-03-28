namespace Cursive {
    export class UserProcess extends Process {
        steps: Step[];
        private valid: boolean;
        private nextStepID: number;

        constructor(
            name: string
            ,inputs: Parameter[]
            ,outputs: Parameter[]
            ,public variables: Variable[]
            ,returnPaths: string[]
            ,readonly fixedSignature: boolean
            ,description: string
            ,folder: string
        ) {
            super(name, inputs, outputs, returnPaths, true, description, folder);
        
            this.steps = [];
            this.valid = false;
            this.nextStepID = 1;
        }

        get isValid(): boolean {
            return this.valid;
        }

        getNextStepID() {
            return this.nextStepID++;
        }

        noteUsedStepID(stepID) {
            this.nextStepID = Math.max(this.nextStepID, stepID + 1);
        }

        validate() : boolean {
            let valid = true;
            for (let step of this.steps)
                if (!step.validate())
                    valid = false;

            // TODO: any other validation rules? e.g. All stop steps must have a return path name or not
            
            this.valid = valid;
            return valid;
        }

        createDefaultSteps() {
            let step: Step = new StartStep(this.getNextStepID(), this, 75, 125);
            step.createDanglingReturnPaths();
            this.steps.push(step);
        }
        removeStep(step: Step) {
            let index = this.steps.indexOf(step);
            this.steps.splice(index, 1);

            // any return paths that lead to this step should now be dangling
            for (let returnPath of step.incomingPaths)
                returnPath.disconnect();

            // any variables that used this step should have it removed
            for (let connector of step.connectors) {
                if (connector.param.link === null)
                    continue;
                let variableLinks = connector.param.link.links;
                let index = variableLinks.indexOf(connector.param);
                variableLinks.splice(index, 1);
            }
        }
    }
}