import React, { useEffect, useState } from 'react';
import { Error } from './ui/Error';
import { WorkspaceEditor } from './ui/WorkspaceEditor';
import { workspaceReducer, WorkspaceDispatchContext } from './reducer';
import { saveProcesses } from './services/saveProcesses';
import { loadWorkspaceAndProcesses } from './services/loadWorkspaceAndProcesses';
import { useUndoReducer } from './services/useUndoReducer';
import { IDebugConfiguration } from './debug/IDebugConfiguration';
import { IDebugState } from './debug/IDebugState';
import { ICustomTool } from './ICustomTool';
import { IWorkspaceData, IUserProcessData } from './services/serializedDataModels';

interface Props {
    className: string;
    loadWorkspace: () => Promise<IWorkspaceData>;
    loadProcesses: undefined | (() => Promise<IUserProcessData[] | null>);
    saveProcesses: (processJson: string) => Promise<void>;
    customTools?: ICustomTool[];
    debug?: IDebugConfiguration;
}

type LoadingState = {
    loading: true;
} | {
    loading: false;
    error: false;
} | {
    loading: false;
    error: true;
    message: string;
}

export const CursiveUI = (props: Props) => {
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
    }, 100);

    const [debugState, setDebugState] = useState<IDebugState | undefined>();

    const [loadingState, setLoadingState] = useState<LoadingState>({ loading: true });

    // Load the workspace and processes only after the initial render
    useEffect(() => {
        loadWorkspaceAndProcesses(props.loadWorkspace, props.loadProcesses)
            .then(result => {
                dispatch({
                    ...result,
                    type: 'load',
                });

                setLoadingState({
                    loading: false,
                    error: false,
                });

                clearHistory();
                noteSaved();
            })
            .catch((err: Error) => {
                setLoadingState({
                    loading: false,
                    error: true,
                    message: err.message,
                });
            })
    }, [props.loadWorkspace, props.loadProcesses, dispatch, clearHistory, noteSaved]);

    if (loadingState.loading) {
        return <div>Loading...</div>
    }
    
    if (loadingState.error) {
        return <Error message={loadingState.message} />
    }

    const doSave = hasUnsavedChanges
        ? async () => {
        const json = saveProcesses(state.processes);
        await props.saveProcesses(json)
        noteSaved();
    } : undefined;

    if (debugState !== undefined) {
        // TODO: render debugger instead of editor?
    }

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
                startDebugger={props.debug === undefined ? undefined : props.debug.start}
            />
        </WorkspaceDispatchContext.Provider>
    )
}
