namespace Cursive {
    export class WorkspaceLoading {
        static loadWorkspace(workspace: Workspace, workspaceXml: HTMLElement) {
            let systemProcesses = new Dictionary<SystemProcess>();
            let userProcesses = new Dictionary<UserProcess>();

            let types = new Dictionary<Type>();
            let typeNodes = workspaceXml.getElementsByTagName('Type');
            
            for (let i=0; i<typeNodes.length; i++) {
                let type = this.loadType(typeNodes[i], workspace, types);
                
                if (types.contains(type.name)) {
                    workspace.showError('There are two types in the workspace with the same name: ' + type.name + '. Type names must be unique.');
                    continue;
                }

                types.add(type.name, type);
            }
        
            let procNodes = workspaceXml.getElementsByTagName('SystemProcess');
            for (let i=0; i<procNodes.length; i++) {
                let process = this.loadProcessDefinition(workspace, procNodes[i], types, true) as SystemProcess;
                systemProcesses.add(process.name, process);
            }

            procNodes = workspaceXml.getElementsByTagName('RequiredProcess');
            for (let i=0; i<procNodes.length; i++) {
                let process = this.loadProcessDefinition(workspace, procNodes[i], types, false) as UserProcess;
                userProcesses.add(process.name, process);
            }

            workspace.setDefinitions(types, systemProcesses, userProcesses);
        }
        private static loadType(typeNode: Element, workspace: Workspace, types: Dictionary<Type>) {
            let name = typeNode.getAttribute('name');

            let color = typeNode.getAttribute('color');
            
            let validationExpression: RegExp;
            if (typeNode.hasAttribute('validation')) {
                let validation = typeNode.getAttribute('validation');
                validationExpression = new RegExp(validation);
            }
            else
                validationExpression = null;

            let extendsType: Type;
            if (typeNode.hasAttribute('extends')) {
                let extendsName = typeNode.getAttribute('extends');
                if (types.contains(extendsName))
                    extendsType = types.getByName(extendsName);
                else {
                    extendsType = null;
                    workspace.showError('Type ' + name + ' extends a type which has not been defined: ' + extendsName + '.');
                }
            }
            else
                extendsType = null;

            let guidance: string;
            if (typeNode.hasAttribute('guidance')) {
                guidance = typeNode.getAttribute('guidance');
            }

            return new Type(name, color, extendsType, validationExpression, guidance);
        }
        private static loadProcessDefinition(workspace: Workspace, procNode: Element, types: Dictionary<Type>, isSystemProcess: boolean): Process {
            let processName = procNode.getAttribute('name');
            let inputs: Parameter[] = [];
            let outputs: Parameter[] = [];
            let returnPaths: string[] = [];
            let procTypeName = isSystemProcess ? 'system' : 'fixed';
            
            let paramNodes = procNode.getElementsByTagName('Input');
            this.loadParameters(workspace, processName, types, paramNodes, inputs, 'input', procTypeName);

            paramNodes = procNode.getElementsByTagName('Output');
            this.loadParameters(workspace, processName, types, paramNodes, outputs, 'output', procTypeName);
            
            let returnPathNodes = procNode.getElementsByTagName('ReturnPath');
            let usedNames: {[key:string]:boolean} = {};
            for (let i=0; i<returnPathNodes.length; i++) {
                let path = returnPathNodes[i].getAttribute('name');
                
                if (usedNames.hasOwnProperty(path))
                    workspace.showError('The \'' + processName + '\' ' + procTypeName + ' process has two return paths with the same name: ' + processName + '. Return path names must be unique within a process.');
                else {
                    usedNames[path] = null;
                    returnPaths.push(path);    
                }
            }

            let process: Process;
            if (isSystemProcess)
                process = new SystemProcess(processName, inputs, outputs, returnPaths);
            else {
                process = new UserProcess(processName, inputs, outputs, [], returnPaths, true);
                (process as UserProcess).createDefaultSteps();
            }
            
            process.workspace = workspace;
            return process;
        }

        private static loadParameters(workspace: Workspace, processName: string, types: Dictionary<Type>, paramNodes: NodeListOf<Element>, parameters: Parameter[], inputOrOutput: 'input' | 'output', procTypeName: string) {
            let usedNames: {[key:string]:boolean} = {};

            for (let i=0; i<paramNodes.length; i++) {
                let paramName = paramNodes[i].getAttribute('name');
                let paramTypeName = paramNodes[i].getAttribute('type');
                
                let paramType;
                if (types.contains(paramTypeName))
                    paramType = types.getByName(paramTypeName);
                else {
                    workspace.showError('The \'' + processName + '\' ' + procTypeName + ' process has an ' + inputOrOutput + ' (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
                    paramType = null;
                }    
                
                if (usedNames.hasOwnProperty(paramName))
                    workspace.showError('The \'' + processName + '\' ' + procTypeName + ' process has two ' + inputOrOutput + 's with the same name: ' + paramName + '. The names of ' + paramTypeName + 's must be unique within a process.');
                else {
                    usedNames[paramName] = null;
                    parameters.push(new Parameter(paramName, paramType));
                }
            }
        }
    }
}