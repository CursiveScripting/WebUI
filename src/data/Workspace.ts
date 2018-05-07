import { Dictionary } from './Dictionary';
import { SystemProcess } from './SystemProcess';
import { Type } from './Type';
import { UserProcess } from './UserProcess';
import { WorkspaceLoading } from '../io/WorkspaceLoading';
import { ProcessLoading } from '../io/ProcessLoading';
import { ProcessSaving } from '../io/ProcessSaving';

export class Workspace {
    systemProcesses: Dictionary<SystemProcess>;
    userProcesses: Dictionary<UserProcess>;
    types: Dictionary<Type>;
    
    public static loadFromString(workspaceXml: string) {
        let tmp = document.createElement('div');
        tmp.innerHTML = workspaceXml;
        return WorkspaceLoading.loadWorkspace(tmp.firstChild as HTMLElement);
    }

    public static loadFromDOM(workspaceXml: Document) {
        return WorkspaceLoading.loadWorkspace(workspaceXml.firstChild as HTMLElement);
    }
    
    public loadProcessesFromString(processXml: string) {
        let tmp = document.createElement('div');
        tmp.innerHTML = processXml;
        return ProcessLoading.loadProcesses(this, tmp.firstChild as HTMLElement);
    }

    public loadProcessesFromDOM(processXml: Document) {
        return ProcessLoading.loadProcesses(this, processXml.firstChild as HTMLElement);
    }

    saveProcesses() {
        return ProcessSaving.saveProcesses(this.userProcesses);
    }

    constructor() {
        this.systemProcesses = new Dictionary<SystemProcess>();
        this.userProcesses = new Dictionary<UserProcess>();
        this.types = new Dictionary<Type>();
    }

    validate() {
        let valid = true;

        for (let i = 0; i < this.userProcesses.count; i++) {
            let process = this.userProcesses.values[i];
            if (!process.validate()) {
                valid = false;
            }
        }

        return valid;
    }
    
    showError(message: string) {
        // console.error(message);
    }
}