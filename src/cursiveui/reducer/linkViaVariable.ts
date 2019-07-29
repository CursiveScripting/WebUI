import { IWorkspaceState } from '../state/IWorkspaceState';
import { linkVariable } from './linkVariable';
import { addVariable, AddVariableBase } from './addVariable';

export type LinkViaVariableAction = {
    type: 'link via variable';
    fromStepId: string;
    fromStepParamName: string;
    fromStepInputParam: boolean;
    toStepId: string;
    toStepParamName: string;
    toStepInputParam: boolean;
} & AddVariableBase;

export function linkViaVariable(state: IWorkspaceState, action: LinkViaVariableAction) {
    state = addVariable(state, action);

    state = linkVariable(state, {
        inProcessName: action.inProcessName,
        varName: action.varName,
        stepId: action.fromStepId,
        stepParamName: action.fromStepParamName,
        stepInputParam: action.fromStepInputParam,
    });
    
    return linkVariable(state, {
        inProcessName: action.inProcessName,
        varName: action.varName,
        stepId: action.toStepId,
        stepParamName: action.toStepParamName,
        stepInputParam: action.toStepInputParam,
    });
}