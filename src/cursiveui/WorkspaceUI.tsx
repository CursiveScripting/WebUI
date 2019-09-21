import React, { useEffect, useState } from 'react';
import { WorkspaceEditor } from './ui/WorkspaceEditor';
import { workspaceReducer, WorkspaceDispatchContext, WorkspaceAction } from './reducer';
import { saveProcesses } from './services/saveProcesses';
import { loadWorkspaceAndProcesses } from './services/loadWorkspaceAndProcesses';
import { useUndoReducer, UndoAction } from './services/useUndoReducer';
import { ICustomTool } from './ICustomTool';
import { IWorkspaceData, IUserProcessData } from './services/serializedDataModels';

export interface Props {
    className: string;
    loadWorkspace: () => Promise<IWorkspaceData>;
    loadProcesses: undefined | (() => Promise<IUserProcessData[] | null>);
    saveProcesses: (processData: IUserProcessData[]) => Promise<void>;
    customTools?: ICustomTool[];
}

const logAction = (action: WorkspaceAction | UndoAction) => console.log('action', action);

export const WorkspaceUI = (props: Props) => {
    const {
        state,
        dispatch,
        undo,
        redo,
        clearHistory,
        noteSaved,
        hasUnsavedChanges
    } = useUndoReducer(workspaceReducer, {
        types: [],
        processes: [],
    }, 100, logAction);

    const [loading, setLoading] = useState(true);

    // Load the workspace and processes only after the initial render
    useEffect(() => {
        loadWorkspaceAndProcesses(props.loadWorkspace, props.loadProcesses)
            .then(result => {
                dispatch({
                    ...result,
                    type: 'load',
                });

                setLoading(false);

                clearHistory();
                noteSaved();
            })
    }, [props.loadWorkspace, props.loadProcesses, dispatch, clearHistory, noteSaved]);

    if (loading) {
        return <div>Loading...</div>
    }

    const doSave = hasUnsavedChanges
        ? async () => {
        const data = saveProcesses(state.processes);
        await props.saveProcesses(data)
        noteSaved();
    } : undefined;

    return (
        <WorkspaceDispatchContext.Provider value={dispatch}>
            <WorkspaceEditor
                className={props.className}
                processes={state.processes}
                types={state.types}
                undo={undo}
                redo={redo}
                save={doSave}
                customTools={props.customTools}
            />
        </WorkspaceDispatchContext.Provider>
    )
}
