import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';
import { usesInputs, usesOutputs } from '../services/StepFunctions';

export type RemoveVariableAction = {
    type: 'remove variable';
    inProcessName: string;
    varName: string;
}

export function removeVariable(state: IWorkspaceState, action: RemoveVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    const varIndex = process.variables.findIndex(v => v.name === action.varName);

    if (varIndex === -1) {
        return state;
    }

    process.variables = process.variables.slice();
    const removedVar = process.variables.splice(varIndex, 1)[0];

    const processes = state.processes.slice();
    processes[processIndex] = process;

    process.steps = process.steps.map(sourceStep => {
        const modifiedStep = { ...sourceStep };
        let matched = false;

        if (usesInputs(modifiedStep)) {
            let inputMatched = false;
            const inputs = modifiedStep.inputs.map(param => {
                if (param.connection !== undefined && param.connection.name === removedVar.name) { // TODO: why does this fail if we match by reference?
                    inputMatched = true;
                    
                    return {
                        name: param.name,
                        type: param.type,
                    }
                }
                return param;
            })

            if (inputMatched) {
                modifiedStep.inputs = inputs;
                matched = true;
            }
        }

        if (usesOutputs(modifiedStep)) {
            let outputMatched = false;
            const outputs = modifiedStep.outputs.map(param => {
                if (param.connection !== undefined && param.connection.name === removedVar.name) { // TODO: why does this fail if we match references?
                    outputMatched = true;

                    return {
                        name: param.name,
                        type: param.type,
                    }
                }
                return param;
            })

            if (outputMatched) {
                modifiedStep.outputs = outputs;
                matched = true;
            }
        }

        return matched
            ? modifiedStep
            : sourceStep;
    })

    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    };
}