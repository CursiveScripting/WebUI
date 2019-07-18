import React, { useEffect, useState } from 'react';
import { WorkspaceEditor } from './ui/WorkspaceEditor';
import { workspaceReducer, WorkspaceDispatchContext } from './reducer';
import { saveProcesses } from './services/saveProcesses';
import { loadWorkspaceAndProcesses } from './services/loadWorkspaceAndProcesses';
import { useUndoReducer } from './services/useUndoReducer';

interface Props {
    className: string;
    loadWorkspace: () => Promise<Document | string>;
    loadProcesses: undefined | (() => Promise<string | null>);
    saveProcesses: (processXml: string) => Promise<void>;
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
    const { state, dispatch, undo, redo, clearHistory } = useUndoReducer(workspaceReducer, {
        types: [],
        processes: [],
        errors: {},
    }, 100);

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
            })
            .catch((err: Error) => {
                setLoadingState({
                    loading: false,
                    error: true,
                    message: err.message,
                });
            })
    }, [props.loadWorkspace, props.loadProcesses, dispatch, clearHistory]);

    if (loadingState.loading) {
        return <div>Loading...</div>
    }
    
    if (loadingState.error) {
        return (
            <div>
                <h1>Error</h1>
                <p>{loadingState.message}</p>
            </div>
        )
    }
    
    const doSave = () => {
        const xml = saveProcesses(state.processes);
        props.saveProcesses(xml)
    };

    return (
        <WorkspaceDispatchContext.Provider value={dispatch}>
            <WorkspaceEditor
                className={props.className}
                processes={state.processes}
                errors={state.errors}
                types={state.types}
                undo={undo}
                redo={redo}
                save={doSave}
            />
        </WorkspaceDispatchContext.Provider>
    )
}
