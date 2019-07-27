import { loadWorkspace } from './loadWorkspace';
import { loadProcesses } from './loadProcesses';
import { isUserProcess } from './ProcessFunctions';
import { validate } from '../reducer/validate';

export async function loadWorkspaceAndProcesses(getWorkspace: () => Promise<Document | string>, getProcesses?: () => Promise<Document | string | null>) {
    const workspaceData = await getWorkspace();

    const workspace = loadWorkspace(workspaceData);

    if (getProcesses !== undefined) {
        const processXml = await getProcesses();
        if (processXml !== null) {
            loadProcesses(workspace, processXml);
        }
    }
    
    for (const process of workspace.processes) {
        if (isUserProcess(process)) {
            process.errors = validate(process, workspace.processes);
        }
    }

    return workspace;
}