import { WorkspaceLoading } from './WorkspaceLoading';
import { ProcessLoading } from './ProcessLoading';

export async function loadWorkspaceAndProcesses(loadWorkspace: () => Promise<Document | string>, loadProcesses?: () => Promise<Document | string | null>) {
    const workspaceData = await loadWorkspace();

    const workspace = WorkspaceLoading.load(workspaceData);

    if (loadProcesses !== undefined) {
        const processXml = await loadProcesses();
        if (processXml !== null) {
            ProcessLoading.load(workspace, processXml);
        }
    }
    
    // workspace.validateAll();

    return workspace;
}