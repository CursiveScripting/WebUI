import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { usesOutputs, usesInputs } from '../services/StepFunctions';

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

    process.steps = process.steps.map(step => {
        if (step.uniqueId !== action.stepId) {
            return step;
        }

        const modifiedStep = { ...step };

        let modifyingParameters;

        if (action.stepInputParam) {
            if (!usesInputs(modifiedStep)) {
                return step;
            }

            modifiedStep.inputs = modifyingParameters = { ...modifiedStep.inputs };
        }
        else {
            if (!usesOutputs(modifiedStep)) {
                return step;
            }
            
            modifiedStep.outputs = modifyingParameters = { ...modifiedStep.outputs };
        }

        if (action.varName === undefined) {
            delete modifyingParameters[action.stepParamName];
        }
        else {
            modifyingParameters[action.stepParamName] = action.varName;
        }
        
        return modifiedStep;
    });

    const processes = state.processes.slice();
    processes[processIndex] = process;
    
    return {
        ...state,
        processes,
    }
}