import { loadWorkspace } from "./loadWorkspace";
import { loadProcesses } from "./loadProcesses";

export async function loadWorkspaceAndProcesses(getWorkspace: () => Promise<Document | string>, getProcesses?: () => Promise<Document | string | null>) {
    const workspaceData = await getWorkspace();

    const workspace = loadWorkspace(workspaceData);

    if (getProcesses !== undefined) {
        const processXml = await getProcesses();
        if (processXml !== null) {
            loadProcesses(workspace, processXml);
        }
    }
    
    // workspace.validateAll();

    return workspace;
}