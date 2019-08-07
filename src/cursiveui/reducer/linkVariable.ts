import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { usesOutputs, usesInputs, replaceVariableReferences } from '../services/StepFunctions';
import { validate } from './validate';
import { IStepParameter } from '../state/IStepParameter';
import { IUserProcess } from '../state/IUserProcess';

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

    let process = { ...state.processes[processIndex] } as IUserProcess;

    if (!isUserProcess(process)) {
        return state;
    }

    process.variables = process.variables.slice();

    const newVariable = action.varName === undefined
        ? undefined
        : process.variables.find(v => v.name === action.varName);

    if (action.varName !== undefined && newVariable === undefined) {
        return state;
    }

    const stepIndex = process.steps.findIndex(step => step.uniqueId === action.stepId);

    const newStep = {
        ...process.steps[stepIndex],
    };

    process.steps = [ ...process.steps ];

    let modifyingParameters: IStepParameter[];

    if (action.stepInputParam) {
        if (!usesInputs(newStep)) {
            return state;
        }

        newStep.inputs = modifyingParameters = [ ...newStep.inputs ];
    }
    else {
        if (!usesOutputs(newStep)) {
            return state;
        }
        
        newStep.outputs = modifyingParameters = [ ...newStep.outputs ];
    }
    
    var paramIndex = modifyingParameters.findIndex(p => p.name === action.stepParamName);
    const oldParameter = modifyingParameters[paramIndex];
    const oldVariable = oldParameter.connection;

    const newParameter = {
        ...oldParameter,
        connection: newVariable,
    };

    modifyingParameters[paramIndex] = newParameter;

    process.steps[stepIndex] = newStep;
    

    if (newVariable !== undefined) {
        const newVarIndex = process.variables.indexOf(newVariable);

        const replacementNewVariable = {
            ...newVariable,
            incomingLinks: !action.stepInputParam
                ? [ ...newVariable.incomingLinks, newParameter ]
                : newVariable.incomingLinks,
            outgoingLinks: action.stepInputParam
                ? [ ...newVariable.outgoingLinks, newParameter ]
                : newVariable.outgoingLinks,
        }

        process.variables[newVarIndex] = replacementNewVariable;

        process = replaceVariableReferences(process, newVariable, replacementNewVariable, replacementNewVariable);
    }

    if (oldVariable !== undefined) {
        const oldVarIndex = process.variables.indexOf(oldVariable);
        
        const replacementOldVariable = {
            ...oldVariable,
            incomingLinks: oldVariable.incomingLinks.filter(p => p !== oldParameter),
            outgoingLinks: oldVariable.outgoingLinks.filter(p => p !== oldParameter),
        };

        process.variables[oldVarIndex] = replacementOldVariable;
        
        process = replaceVariableReferences(process, oldVariable, replacementOldVariable, replacementOldVariable);
    }

    const processes = state.processes.slice();
    processes[processIndex] = process;
    
    process.errors = validate(process, processes);
    
    return {
        ...state,
        processes,
    }
}