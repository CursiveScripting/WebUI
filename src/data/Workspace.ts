import { SystemProcess } from './SystemProcess';
import { Type } from './Type';
import { UserProcess } from './UserProcess';
import { WorkspaceLoading } from '../io/WorkspaceLoading';
import { ProcessLoading } from '../io/ProcessLoading';
import { ProcessSaving } from '../io/ProcessSaving';
import { ValidationSummary } from './ValidationSummary';

export class Workspace {
    systemProcesses = new Map<string, SystemProcess>();
    userProcesses = new Map<string, UserProcess>();
    types = new Map<string, Type>();
    
    readonly validationSummary = new ValidationSummary();

    get isValid(): boolean {
        return !this.validationSummary.hasAnyErrors;
    }
    public static loadFromString(workspaceXml: string) {
        return WorkspaceLoading.loadWorkspace(Workspace.stringToElement(workspaceXml));
    }

    public static loadFromDOM(workspaceXml: Document) {
        return WorkspaceLoading.loadWorkspace(workspaceXml.firstChild as HTMLElement);
    }
    
    private static stringToElement(xml: string) {
        const parser = new DOMParser();
        return parser.parseFromString(xml, 'application/xml').documentElement;
    }

    public loadProcessesFromString(processXml: string) {
        return ProcessLoading.loadProcesses(this, Workspace.stringToElement(processXml));
    }

    public loadProcessesFromDOM(processXml: Document) {
        return ProcessLoading.loadProcesses(this, processXml.firstChild as HTMLElement);
    }

    saveProcesses() {
        return ProcessSaving.saveProcesses(this.userProcesses);
    }

    validateAll() {
        this.validationSummary.clear();

        for (let [name, process] of this.userProcesses) {
            this.validateProcess(process);
        }

        return !this.validationSummary.hasAnyErrors;
    }

    validateProcess(process: UserProcess) {
        let processErrors = process.validate();
        this.validationSummary.setProcessErrors(process, processErrors);
        
        return processErrors;
    }
    
    showError(message: string) {
        // console.error(message);
    }
}