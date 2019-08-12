import { Reducer, createContext, Dispatch} from 'react';
import { IWorkspaceState } from '../state/IWorkspaceState';
import { addProcess, AddProcessAction } from './addProcess';
import { load, LoadAction } from './load';
import { editProcess, EditProcessAction } from './editProcess';
import { removeProcess, RemoveProcessAction } from './removeProcess';
import { addStep, AddStepAction } from './addStep';
import { addStopStep, AddStopStepAction } from './addStopStep';
import { removeStep, RemoveStepAction } from './removeStep';
import { addVariable, AddVariableAction } from './addVariable';
import { removeVariable, RemoveVariableAction } from './removeVariable';
import { moveStep, MoveStepAction } from './moveStep';
import { moveVariable, MoveVariableAction } from './moveVariable';
import { setReturnPath, SetReturnPathAction } from './setReturnPath';
import { linkVariable, LinkVariableAction } from './linkVariable';
import { setVariable, SetVariableAction } from './setVariable';
import { linkNewVariable, LinkNewVariableAction } from './linkNewVariable';
import { linkViaVariable, LinkViaVariableAction } from './linkViaVariable';
import { UnlinkVariableAction, unlinkVariable } from './unlinkVariable';
import { RenameVariableAction, renameVariable } from './renameVariable';

export type WorkspaceAction = LoadAction
| AddProcessAction
| EditProcessAction
| RemoveProcessAction
| AddStepAction
| AddStopStepAction
| RemoveStepAction
| AddVariableAction
| RemoveVariableAction
| MoveStepAction
| MoveVariableAction
| RenameVariableAction
| SetReturnPathAction
| LinkVariableAction
| UnlinkVariableAction
| SetVariableAction
| LinkNewVariableAction
| LinkViaVariableAction


export const WorkspaceDispatchContext = createContext<Dispatch<WorkspaceAction>>(ignore => {});


export const workspaceReducer: Reducer<IWorkspaceState, WorkspaceAction> = (state, action) => {
    console.log('action', action);

    switch (action.type) {
        case 'load':
            return load(action);

        case 'add process':
            return addProcess(state, action);

        case 'edit process':
            return editProcess(state, action);

        case 'remove process':
            return removeProcess(state, action);

        case 'add step':
            return addStep(state, action);

        case 'add stop step':
            return addStopStep(state, action);

        case 'remove step':
            return removeStep(state, action);

        case 'add variable':
            return addVariable(state, action);

        case 'remove variable':
            return removeVariable(state, action);

        case 'move step':
            return moveStep(state, action);

        case 'move variable':
            return moveVariable(state, action);
        
        case 'rename variable':
            return renameVariable(state, action);

        case 'set return path':
            return setReturnPath(state, action);

        case 'link variable':
            return linkVariable(state, action);

        case 'unlink variable':
            return unlinkVariable(state, action);

        case 'set variable':
            return setVariable(state, action);

        case 'link new variable':
            return linkNewVariable(state, action);

        case 'link via variable':
            return linkViaVariable(state, action);
    }
}