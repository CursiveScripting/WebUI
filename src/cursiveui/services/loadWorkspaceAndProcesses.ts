import { loadWorkspace, IWorkspaceData } from './loadWorkspace';
import { loadProcesses, IUserProcessData } from './loadProcesses';
import { isUserProcess } from './ProcessFunctions';
import { validate } from '../reducer/validate';

export async function loadWorkspaceAndProcesses(getWorkspace: () => Promise<IWorkspaceData>, getProcesses?: () => Promise<IUserProcessData[] | null>) {
    const workspaceData = await getWorkspace();

    const workspace = loadWorkspace(workspaceData);

    if (getProcesses !== undefined) {
        const processData = await getProcesses();
        if (processData !== null) {
            loadProcesses(workspace, processData);
        }
    }
    
    for (const process of workspace.processes) {
        if (isUserProcess(process)) {
            process.errors = validate(process, workspace.processes);
        }
    }

    return workspace;
}