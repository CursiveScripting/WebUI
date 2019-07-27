import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { usesOutputs, usesInputs } from '../services/StepFunctions';
import { validate } from './validate';
import { IStepParameter } from '../state/IStepParameter';

export type LinkVariableAction = {
    type: 'link variable';
    inProcessName: string;
    varName?: string;
    stepId: string;
    stepParamName: string;
    stepInputParam: boolean;
}

export function linkVariable(state: IWorkspaceState, action: LinkVariableAction) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    const variable = action.varName === undefined
        ? undefined
        : process.variables.find(v => v.name === action.varName);

    if (action.varName !== undefined && variable === undefined) {
        return state;
    }

    process.steps = process.steps.map(step => {
        if (step.uniqueId !== action.stepId) {
            return step;
        }

        const modifiedStep = { ...step };

        let modifyingParameters: IStepParameter[];

        if (action.stepInputParam) {
            if (!usesInputs(modifiedStep)) {
                return step;
            }

            modifiedStep.inputs = modifyingParameters = [ ...modifiedStep.inputs ];
        }
        else {
            if (!usesOutputs(modifiedStep)) {
                return step;
            }
            
            modifiedStep.outputs = modifyingParameters = [ ...modifiedStep.outputs ];
        }

        var paramIndex = modifyingParameters.findIndex(p => p.name === action.stepParamName);
        modifyingParameters[paramIndex] = {
            ...modifyingParameters[paramIndex],
            connection: variable,
        }
        
        return modifiedStep;
    });

    const processes = state.processes.slice();
    processes[processIndex] = process;
    
    process.errors = validate(process, processes);
    
    return {
        ...state,
        processes,
    }
}