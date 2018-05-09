import { Process } from './Process';
import { Parameter } from './Parameter';
import { Step } from './Step';
import { Variable } from './Variable';
import { Type } from './Type';
import { StartStep } from './StartStep';
import { Dictionary } from './Dictionary';

export class UserProcess extends Process {
    steps: Dictionary<Step>;
    private valid: boolean;
    private nextStepID: number;

    constructor(
        name: string,
        inputs: Parameter[],
        outputs: Parameter[],
        public variables: Variable[],
        returnPaths: string[],
        readonly fixedSignature: boolean,
        description: string,
        folder: string | null
    ) {
        super(name, inputs, outputs, returnPaths, true, description, folder);
    
        this.steps = new Dictionary<Step>();
        this.valid = false;
        this.nextStepID = 1;
    }

    get isValid(): boolean {
        return this.valid;
    }

    getNextStepID() {
        while (true) {
            let stepID = (this.nextStepID++).toString();
            if (!this.steps.contains(stepID)) {
                return stepID;
            } 
        }
    }

    validate() {
        let valid = true;
        for (let step of this.steps.values) {
            if (!step.validate()) {
                valid = false;
            }
        }

        if (valid) {
            // TODO: any other validation rules? variable-assignment detection, etc?
        }
        
        this.valid = valid;
        return valid;
    }

    getNewVariableName(type: Type) {
        let prefix = type.name + ' ';
        let num = 1;
        
        while (true) {
            let name = prefix + num;
            if (this.variables.filter(v => v.name === name).length === 0) {
                return name;
            }
            num++;
        }
    }

    createDefaultSteps() {
        let step: Step = new StartStep(this.getNextStepID(), this, 32, 32);
        this.steps.add(step.uniqueID, step);
    }

    removeStep(step: Step) {
        this.steps.remove(step.uniqueID);

        // any return paths that lead to or come from this step should be removed
        for (let returnPath of step.incomingPaths) {
            let removeFrom = returnPath.fromStep.returnPaths;
            let index = removeFrom.indexOf(returnPath);
            removeFrom.splice(index, 1);
        }
        for (let returnPath of step.returnPaths) {
            let removeFrom = returnPath.toStep.incomingPaths;
            let index = removeFrom.indexOf(returnPath);
            removeFrom.splice(index, 1);
        }

        // this step's input/output parameters should be unlinked from everything
        for (let param of step.inputs) {
            if (param.link === null) {
                continue;
            }

            let removeFrom = param.link.links;
            let index = removeFrom.indexOf(param);
            removeFrom.splice(index, 1);
        }
        for (let param of step.outputs) {
            if (param.link === null) {
                continue;
            }

            let removeFrom = param.link.links;
            let index = removeFrom.indexOf(param);
            removeFrom.splice(index, 1);
        }
    }

    removeVariable(variable: Variable) {
        let index = this.variables.indexOf(variable);
        this.variables.splice(index, 1);

        for (let link of variable.links) {
            link.link = null;
        }
    }
}