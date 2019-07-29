import { IWorkspaceState } from '../state/IWorkspaceState';
import { linkVariable, LinkVariableBase } from './linkVariable';
import { addVariable, AddVariableBase } from './addVariable';

export type LinkNewVariableAction = {
    type: 'link new variable';
} & AddVariableBase & LinkVariableBase;

export function linkNewVariable(state: IWorkspaceState, action: LinkNewVariableAction) {
    return linkVariable(addVariable(state, action), action);
}