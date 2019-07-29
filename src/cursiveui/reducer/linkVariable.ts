import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { usesOutputs, usesInputs } from '../services/StepFunctions';
import { validate } from './validate';
import { IStepParameter } from '../state/IStepParameter';
import { IVariable } from '../state/IVariable';

export type LinkVariableBase = {
    inProcessName: string;
    varName?: string;
    stepId: string;
    stepParamName: string;
    stepInputParam: boolean;
}

export type LinkVariableAction = {
    type: 'link variable';
} & LinkVariableBase

export function linkVariable(state: IWorkspaceState, action: LinkVariableBase) {
    const processIndex = state.processes.findIndex(p => p.name === action.inProcessName);

    const process = { ...state.processes[processIndex] };

    if (!isUserProcess(process)) {
        return state;
    }

    process.variables = process.variables.slice();

    const variable = action.varName === undefined
        ? undefined
        : process.variables.find(v => v.name === action.varName);

    let oldParameter: IStepParameter | undefined;
    let newParameter: IStepParameter | undefined;
    let oldVariable: IVariable | undefined;

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
        oldParameter = modifyingParameters[paramIndex];

        newParameter = {
            ...oldParameter,
            connection: variable,
        };

        modifyingParameters[paramIndex] = newParameter;
        
        return modifiedStep;
    });

    if (oldParameter === undefined || newParameter === undefined) {
        return state;
    }
    
    if (variable !== undefined) {
        const varIndex = process.variables.indexOf(variable);

        process.variables[varIndex] = {
            ...variable,
            incomingLinks: !action.stepInputParam
                ? [ ...variable.incomingLinks, newParameter ]
                : variable.incomingLinks,
            outgoingLinks: action.stepInputParam
                ? [ ...variable.outgoingLinks, newParameter ]
                : variable.outgoingLinks,
        };
    }

    if (oldVariable !== undefined) {
        const varIndex = process.variables.indexOf(oldVariable);
        
        process.variables[varIndex] = {
            ...oldVariable,
            incomingLinks: oldVariable.incomingLinks.filter(p => p !== oldParameter),
            outgoingLinks: oldVariable.outgoingLinks.filter(p => p !== oldParameter),
        };
    }


    const processes = state.processes.slice();
    processes[processIndex] = process;
    
    process.errors = validate(process, processes);
    
    return {
        ...state,
        processes,
    }
}