import React, { createContext, useReducer, Dispatch, useEffect, useState } from 'react';
import { WorkspaceEditor } from './ui/WorkspaceEditor';
import { workspaceReducer } from './workspaceState/reducer';
import { WorkspaceAction } from './workspaceState/actions';
import { WorkspaceLoading } from './services/WorkspaceLoading';
import { ProcessSaving } from './services/ProcessSaving';
import { ProcessLoading } from './services/ProcessLoading';

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
    messages: string[];
}

export const CursiveUI = (props: Props) => {
    const [workspace, dispatchWorkspace] = useReducer(workspaceReducer, {
        types: [],
        processes: [],
    });

    const WorkspaceDispatchContext = createContext<Dispatch<WorkspaceAction>>(ignore => {});

    const [loadingState, setLoadingState] = useState<LoadingState>({ loading: true });

    // Load the workspace and processes only after the initial render
    useEffect(() => {
        loadWorkspace(props.loadWorkspace, props.loadProcesses)
            .then(result => {
                dispatchWorkspace({
                    ...result,
                    type: 'load',
                });

                setLoadingState({
                    loading: false,
                    error: false
                });
            })
            //.catch(err => {})
    }, []);

    if (loadingState.loading) {
        return <div>Loading...</div>
    }
    else if (loadingState.error) {
        return (
            <div>
                <h1>Error</h1>
                {loadingState.messages.map((m, i) => <div key={i}>{m}</div>)}
            </div>
        )
    }
    else {
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
}

async function loadWorkspace(loadWorkspace: () => Promise<Document | string>, loadProcesses?: () => Promise<string | null>) {
    const workspaceData = await loadWorkspace();

    const workspace = WorkspaceLoading.load(workspaceData, showError);

    // TODO: showError should cause this promise to fail, I guess?

    if (loadProcesses !== undefined) {
        const processXml = await loadProcesses();
        if (processXml !== null) {
            ProcessLoading.load(workspace, processXml, showError);
        }
    }
    
    // workspace.validateAll();

    return workspace;
}
