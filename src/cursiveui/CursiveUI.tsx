import React, { useReducer, useEffect, useState } from 'react';
import { WorkspaceEditor } from './ui/WorkspaceEditor';
import { workspaceReducer } from './workspaceState/reducer';
import { WorkspaceDispatchContext } from './workspaceState/actions';
import { ProcessSaving } from './services/ProcessSaving';
import { loadWorkspaceAndProcesses } from './services/loadWorkspaceAndProcesses';

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
    const [workspace, dispatchWorkspace] = useReducer(workspaceReducer, {
        types: {},
        processes: [],
    });

    const [loadingState, setLoadingState] = useState<LoadingState>({ loading: true });

    // Load the workspace and processes only after the initial render
    useEffect(() => {
        loadWorkspaceAndProcesses(props.loadWorkspace, props.loadProcesses)
            .then(result => {
                dispatchWorkspace({
                    ...result,
                    type: 'load',
                });

                setLoadingState({
                    loading: false,
                    error: false,
                });
            })
            .catch((err: Error) => {
                setLoadingState({
                    loading: false,
                    error: true,
                    message: err.message,
                });
            })
    }, []);

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
        const xml = ProcessSaving.saveProcesses(workspace.processes);
        props.saveProcesses(xml)
    };

    return (
        <WorkspaceDispatchContext.Provider value={dispatchWorkspace}>
            <WorkspaceEditor
                className={props.className}
                workspace={workspace}
                save={doSave}
            />
        </WorkspaceDispatchContext.Provider>
    )
}
