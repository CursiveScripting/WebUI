import { Dictionary } from './Dictionary';
import { SystemProcess } from './SystemProcess';
import { Type } from './Type';
import { UserProcess } from './UserProcess';
import { WorkspaceLoading } from '../io/WorkspaceLoading';
import { ProcessLoading } from '../io/ProcessLoading';
import { ProcessSaving } from '../io/ProcessSaving';
import { ValidationSummary } from './ValidationSummary';

export class Workspace {
    systemProcesses: Dictionary<SystemProcess>;
    userProcesses: Dictionary<UserProcess>;
    types: Dictionary<Type>;
    
    readonly validationSummary: ValidationSummary;

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
        let tmp = document.createElement('div');
        tmp.innerHTML = xml;
        return tmp.firstChild as HTMLElement;
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

    constructor() {
        this.systemProcesses = new Dictionary<SystemProcess>();
        this.userProcesses = new Dictionary<UserProcess>();
        this.types = new Dictionary<Type>();

        this.validationSummary = new ValidationSummary();
    }

    validateAll() {
        this.validationSummary.clear();

        for (let process of this.userProcesses.values) {
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