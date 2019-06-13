﻿import { Process } from './Process';
import { Parameter } from './Parameter';
import { Step, StepType } from './Step';
import { Variable } from './Variable';
import { Type } from './Type';
import { StartStep } from './StartStep';
import { ValidationError } from './ValidationError';
import { gridSize } from '../ui/canvas/gridSize';
import { findInMap } from './findInMap';

export class UserProcess extends Process {
    steps: Map<string, Step>;
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
    
        this.steps = new Map<string, Step>();
        this.nextStepID = 1;
    }

    getNextStepID() {
        while (true) {
            let stepID = (this.nextStepID++).toString();
            if (!this.steps.has(stepID)) {
                return stepID;
            } 
        }
    }

    validate(): ValidationError[] {
        let errors: ValidationError[] = [];

        for (const [, step] of this.steps) {
            errors = [...errors, ...step.validate()];
        }

        if (errors.length === 0) {
            let unassignedVariables = this.variables.filter(v => v.initialValue === null);
            let currentStep = findInMap(this.steps, s => s.stepType === StepType.Start)!;
            
            this.checkUnassignedVariableUse(currentStep, [], unassignedVariables, errors);
        }
        
        return errors;
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
        let step: Step = new StartStep(this.getNextStepID(), this, gridSize * 2, gridSize * 2);
        this.steps.set(step.uniqueID, step);
    }

    removeStep(step: Step) {
        this.steps.delete(step.uniqueID);

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

    private checkUnassignedVariableUse(currentStep: Step, visitedSteps: Step[], unassignedVariables: Variable[], errors: ValidationError[]) {
        visitedSteps.push(currentStep);

        unassignedVariables = unassignedVariables.slice();

        // remove variables that currentStep's outputs connect to from the unassigned list
        for (let output of currentStep.outputs) {
            if (output.link !== null) {
                let index = unassignedVariables.indexOf(output.link);
                if (index !== -1) {
                    unassignedVariables.splice(index, 1);
                }
            }
        }

        let allValid = true;

        for (let path of currentStep.returnPaths) {
            let nextStep = path.toStep;

            if (visitedSteps.indexOf(nextStep) !== -1) {
                continue; // already processed this step, don't do it again
            }

            // check each input of nextStep, if it touches anything in unassignedVariables, that's not valid
            for (let input of nextStep.inputs) {
                if (input.link !== null) {
                    let index = unassignedVariables.indexOf(input.link);
                    if (index !== -1) {
                        errors.push(new ValidationError(nextStep, input, undefined, `Variable is used before it is assigned: ${input.link.name}`));
                        return false; // once an uninitialized variable is used, stop down this branch
                    }
                }
            }

            if (!this.checkUnassignedVariableUse(nextStep, visitedSteps, unassignedVariables, errors)) {
                allValid = false;
            }
        }

        return allValid;
    }
}