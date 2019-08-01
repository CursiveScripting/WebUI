import { IUserProcess } from '../state/IUserProcess';
import { IProcess } from '../state/IProcess';
import { IValidationError } from '../state/IValidationError';
import { usesInputs, usesOutputs } from '../services/StepFunctions';
import { IStep, StepType, IStepWithOutputs } from '../state/IStep';
import { IVariable } from '../state/IVariable';
import { IStartStep } from '../state/IStartStep';

export function validate(process: IUserProcess, allProcesses: IProcess[]) {
    const errors: IValidationError[] = [];

    for (const step of process.steps) {
        if (usesInputs(step)) {
            if (!step.inputConnected) {
                errors.push({
                    step: step,
                    message: 'No path leads to this step',
                });
            }

            for (const input of step.inputs) {
                if (input.connection === undefined) {
                    errors.push({
                        step: step,
                        parameter: input,
                        message: 'Input not connected',
                    });
                }
            }
        }

        if (usesOutputs(step)) {
            for (const path of step.returnPaths) {
                if (path.connection === undefined) {
                    errors.push({
                        step,
                        returnPath: path.name,
                        message: 'Return path not connected',
                    });
                }
            }
        }
    }

    const startStep = process.steps.find(s => s.stepType === StepType.Start);

    if (startStep !== undefined) {
        const unassignedVariables = process.variables.filter(v => v.initialValue === null);
        checkUnassignedVariableUse(startStep as IStartStep, [], unassignedVariables, errors);
    }

    return errors;
}

function checkUnassignedVariableUse(currentStep: IStepWithOutputs, visitedSteps: IStep[], unassignedVariables: IVariable[], errors: IValidationError[]) {
    visitedSteps.push(currentStep);

    unassignedVariables = unassignedVariables.slice();

    // remove variables that currentStep's outputs connect to from the unassigned list
    for (const output of currentStep.outputs) {
        if (output.connection !== undefined) {
            const index = unassignedVariables.indexOf(output.connection);
            if (index !== -1) {
                unassignedVariables.splice(index, 1);
            }
        }
    }

    let allValid = true;

    for (const path of currentStep.returnPaths) {
        const nextStep = path.connection;

        if (nextStep === undefined) {
            continue;
        }

        if (visitedSteps.indexOf(nextStep) !== -1) {
            continue; // already processed this step, don't do it again
        }

        // check each input of nextStep, if it touches anything in unassignedVariables, that's not valid
        for (const input of nextStep.inputs) {
            if (input.connection !== undefined) {
                const index = unassignedVariables.indexOf(input.connection);
                if (index !== -1) {
                    errors.push({
                        step: nextStep,
                        parameter: input,
                        message: `Variable is used before it is assigned: ${input.connection.name}`,
                    });
                    return false; // once an uninitialized variable is used, stop down this branch
                }
            }
        }

        if (usesOutputs(nextStep) && !checkUnassignedVariableUse(nextStep, visitedSteps, unassignedVariables, errors)) {
            allValid = false;
        }
    }

    return allValid;
}