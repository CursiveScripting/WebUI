import { IWorkspaceState } from '../state/IWorkspaceState';
import { isUserProcess } from '../services/ProcessFunctions';
import { validate } from './validate';
import { mapStepParameters } from '../services/StepFunctions';

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

    process.steps = process.steps.map(step => {
        return mapStepParameters(
            step,
            param => param.connection !== undefined && param.connection.name === removedVar.name, // TODO: why does this fail if we match by reference?
            param => { return {
                ...param,
                connection: undefined
            }}
        );
    });

    process.errors = validate(process, processes);

    return {
        ...state,
        processes,
    };
}