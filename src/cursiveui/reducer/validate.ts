import { IUserProcess } from '../state/IUserProcess';
import { IProcess } from '../state/IProcess';
import { ValidationError } from '../state/IValidationError';
import { usesInputs, usesOutputs } from '../services/StepFunctions';


export function validate(process: IUserProcess, allProcesses: IProcess[]) {
    const errors: ValidationError[] = [];

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
                        isInput: true,
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
    
    for (const variable of process.variables) {
        if (variable.outgoingLinks.length > 0 && variable.incomingLinks.length === 0 && variable.initialValue === null) {
            errors.push({
                variable,
                message: 'Variable is used without being initialised',
            });
        }
    }

    return errors;
}