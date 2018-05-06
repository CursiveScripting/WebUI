import { Dictionary } from './Dictionary';
import { SystemProcess } from './SystemProcess';
import { Type } from './Type';
import { UserProcess } from './UserProcess';
import { Parameter } from './Parameter';
import { Process } from './Process';

export class Workspace {
    systemProcesses: Dictionary<SystemProcess>;
    userProcesses: Dictionary<UserProcess>;
    types: Dictionary<Type>;
    
    public static loadWorkspace(workspaceXml: Document) {
        let workspace = new Workspace();
        let systemProcesses = new Dictionary<SystemProcess>();
        let userProcesses = new Dictionary<UserProcess>();

        let types = new Dictionary<Type>();
        let typeNodes = workspaceXml.getElementsByTagName('Type');
        
        for (let i = 0; i < typeNodes.length; i++) {
            let type = this.loadType(typeNodes[i], workspace, types);
            
            if (types.contains(type.name)) {
                workspace.showError('There are two types in the workspace with the same name: ' + type.name + '. Type names must be unique.');
                continue;
            }

            types.add(type.name, type);
        }
    
        let procNodes = workspaceXml.getElementsByTagName('SystemProcess');
        for (let i = 0; i < procNodes.length; i++) {
            let process = this.loadProcessDefinition(workspace, procNodes[i], types, true) as SystemProcess;
            systemProcesses.add(process.name, process);
        }

        procNodes = workspaceXml.getElementsByTagName('RequiredProcess');
        for (let i = 0; i < procNodes.length; i++) {
            let process = this.loadProcessDefinition(workspace, procNodes[i], types, false) as UserProcess;
            userProcesses.add(process.name, process);
        }

        workspace.types = types;
        workspace.systemProcesses = systemProcesses;
        workspace.userProcesses = userProcesses;

        return workspace;
    }

    private static loadType(typeNode: Element, workspace: Workspace, types: Dictionary<Type>) {
        let name = typeNode.getAttribute('name') as string;
        let color = typeNode.getAttribute('color') as string;
        
        let validationExpression: RegExp | undefined;
        if (typeNode.hasAttribute('validation')) {
            let validation = typeNode.getAttribute('validation') as string;
            validationExpression = new RegExp(validation);
        }

        let extendsType: Type | undefined;
        if (typeNode.hasAttribute('extends')) {
            let extendsName = typeNode.getAttribute('extends') as string;
            if (types.contains(extendsName)) {
                extendsType = types.getByName(extendsName);
            }
            else {
                extendsType = undefined;
                workspace.showError(`Type ${name} extends a type which has not been defined: ${extendsName}.`);
            }
        }

        let guidance: string | undefined;
        if (typeNode.hasAttribute('guidance')) {
            guidance = typeNode.getAttribute('guidance') as string;
        }

        return new Type(name, color, extendsType, validationExpression, guidance);
    }

    private static loadProcessDefinition(workspace: Workspace, procNode: Element, types: Dictionary<Type>, isSystemProcess: boolean): Process {
        let processName = procNode.getAttribute('name') as string;
        let inputs: Parameter[] = [];
        let outputs: Parameter[] = [];
        let returnPaths: string[] = [];
        let procTypeName = isSystemProcess ? 'system' : 'fixed';
        
        let folder = procNode.hasAttribute('folder') ? procNode.getAttribute('folder') : null;
        let descNodes = procNode.getElementsByTagName('Description');
        let description = descNodes.length > 0 ? descNodes[0].innerHTML : '';
        
        let paramNodes = procNode.getElementsByTagName('Input');
        this.loadParameters(workspace, processName, types, paramNodes, inputs, 'input', procTypeName);

        paramNodes = procNode.getElementsByTagName('Output');
        this.loadParameters(workspace, processName, types, paramNodes, outputs, 'output', procTypeName);
        
        let returnPathNodes = procNode.getElementsByTagName('ReturnPath');
        let usedNames: {[key: string]: boolean} = {};
        for (let i = 0; i < returnPathNodes.length; i++) {
            let path = returnPathNodes[i].getAttribute('name') as string;
            
            if (usedNames.hasOwnProperty(path)) {
                workspace.showError(`The '${processName}' ${procTypeName} process has two return paths with the same name: ${path}.`
                + ` Return path names must be unique within a process.`);
            }
            else {
                usedNames[path] = true;
                returnPaths.push(path);
            }
        }

        let process: Process;
        if (isSystemProcess) {
            process = new SystemProcess(processName, inputs, outputs, returnPaths, description, folder);
        }
        else {
            process = new UserProcess(processName, inputs, outputs, [], returnPaths, true, description, folder);
            (process as UserProcess).createDefaultSteps();
        }
        
        return process;
    }

    private static loadParameters(
        workspace: Workspace,
        processName: string,
        types: Dictionary<Type>,
        paramNodes: NodeListOf<Element>,
        parameters: Parameter[],
        inputOrOutput: 'input' | 'output',
        procTypeName: string
    ) {
        let usedNames: {[key: string]: boolean} = {};

        for (let i = 0; i < paramNodes.length; i++) {
            let paramName = paramNodes[i].getAttribute('name') as string;
            let paramTypeName = paramNodes[i].getAttribute('type') as string;
            
            let paramType: Type;
            if (types.contains(paramTypeName)) {
                paramType = types.getByName(paramTypeName);
            }
            else {
                workspace.showError(`The '${processName}' ${procTypeName} process has an ${inputOrOutput} (${paramName})`
                 + ` with an unrecognised type: ${paramTypeName}.`);
                continue;
            }    
            
            if (usedNames.hasOwnProperty(paramName)) {
                workspace.showError(`The '${processName}' ${procTypeName} process has two ${inputOrOutput}s`
                    + ` with the same name: ${paramName}. The names of ${paramTypeName}s must be unique within a process.`);
                continue;
            }
                
            usedNames[paramName] = true;
            parameters.push(new Parameter(paramName, paramType));
        }
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