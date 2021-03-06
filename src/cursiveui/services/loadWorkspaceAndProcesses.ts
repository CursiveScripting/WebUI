import { loadWorkspace } from './loadWorkspace';
import { loadProcesses } from './loadProcesses';
import { isUserProcess } from './ProcessFunctions';
import { validate } from '../reducer/validate';
import { IWorkspaceData, IUserProcessData } from './serializedDataModels';

export async function loadWorkspaceAndProcesses(getWorkspace: () => Promise<IWorkspaceData>, getProcesses?: () => Promise<IUserProcessData[] | null>, checkSchemas: boolean = true) {
    const workspaceData = await getWorkspace();

    const workspace = loadWorkspace(workspaceData, checkSchemas);

    if (getProcesses !== undefined) {
        const processData = await getProcesses();
        if (processData !== null) {
            loadProcesses(workspace, processData, checkSchemas);
        }
    }
    
    for (const process of workspace.processes) {
        if (isUserProcess(process)) {
            process.errors = validate(process, workspace.processes);
        }
    }

    return workspace;
}