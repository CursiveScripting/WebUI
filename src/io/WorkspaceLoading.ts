import { Workspace, SystemProcess, Type, UserProcess, Parameter, Process } from '../data';

export class WorkspaceLoading {
    public static loadWorkspace(workspaceXml: HTMLElement) {
        let workspace = new Workspace();
        let systemProcesses = new Map<string, SystemProcess>();
        let userProcesses = new Map<string, UserProcess>();

        let types = new Map<string, Type>();
        let typeNodes = workspaceXml.getElementsByTagName('Type');
        
        for (const typeNode of typeNodes) {
            let type = this.loadType(typeNode, workspace, types);
            
            if (types.has(type.name)) {
                workspace.showError('There are two types in the workspace with the same name: ' + type.name + '. Type names must be unique.');
                continue;
            }

            types.set(type.name, type);
        }
    
        let procNodes = workspaceXml.getElementsByTagName('SystemProcess');
        for (const procNode of procNodes) {
            let process = this.loadProcessDefinition(workspace, procNode, types, true) as SystemProcess;
            systemProcesses.set(process.name, process);
        }

        procNodes = workspaceXml.getElementsByTagName('RequiredProcess');
        for (const procNode of procNodes) {
            let process = this.loadProcessDefinition(workspace, procNode, types, false) as UserProcess;
            userProcesses.set(process.name, process);
        }

        workspace.types = types;
        workspace.systemProcesses = systemProcesses;
        workspace.userProcesses = userProcesses;

        return workspace;
    }

    private static loadType(typeNode: Element, workspace: Workspace, types: Map<string, Type>) {
        let name = typeNode.getAttribute('name') as string;
        let color = typeNode.getAttribute('color') as string;
        
        let validationExpression: RegExp | undefined;
        if (typeNode.hasAttribute('validation')) {
            let validation = typeNode.getAttribute('validation') as string;
            validationExpression = new RegExp(validation);
        }

        let extendsType: Type | null;
        if (typeNode.hasAttribute('extends')) {
            let extendsName = typeNode.getAttribute('extends') as string;
            const tmpExtendsType = types.get(extendsName)
            
            if (tmpExtendsType === undefined) {
                extendsType = null;
                workspace.showError(`Type ${name} extends a type which has not been defined: ${extendsName}.`);
            }
            else {
                extendsType = tmpExtendsType;
            }
        }
        else {
            extendsType = null;
        }

        let guidance: string | undefined;
        if (typeNode.hasAttribute('guidance')) {
            guidance = typeNode.getAttribute('guidance') as string;
        }

        return new Type(name, color, extendsType, validationExpression, guidance);
    }

    private static loadProcessDefinition(workspace: Workspace, procNode: Element, types: Map<string, Type>, isSystemProcess: boolean): Process {
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
        for (const returnPathNode of returnPathNodes) {
            let path = returnPathNode.getAttribute('name') as string;
            
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
        types: Map<string, Type>,
        paramNodes: HTMLCollectionOf<Element>,
        parameters: Parameter[],
        inputOrOutput: 'input' | 'output',
        procTypeName: string
    ) {
        let usedNames: {[key: string]: boolean} = {};
        const isInput = inputOrOutput === 'input';

        for (const paramNode of paramNodes) {
            let paramName = paramNode.getAttribute('name') as string;
            let paramTypeName = paramNode.getAttribute('type') as string;
            
            let paramType = types.get(paramTypeName);
            if (paramType === undefined) {
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
            parameters.push(new Parameter(paramName, paramType, isInput));
        }
    }
}