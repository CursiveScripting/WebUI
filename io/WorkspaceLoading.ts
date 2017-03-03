namespace Cursive {
    export class WorkspaceLoading {
        static loadWorkspace(workspace: Workspace, workspaceXml: HTMLElement) {
            let systemProcesses: {[key:string]:SystemProcess} = {};
            let userProcesses: {[key:string]:UserProcess} = {};

            let typesByName: {[key:string]:Type} = {};
            let typeNodes = workspaceXml.getElementsByTagName('Type');
        
            for (let i=0; i<typeNodes.length; i++) {
                let type = this.loadType(typeNodes[i], workspace, typesByName);
                
                if (typesByName.hasOwnProperty(type.name)) {
                    workspace.showError('There are two types in the workspace with the same name: ' + name + '. Type names must be unique.');
                    continue;
                }

                typesByName[type.name] = type;
            }
        
            let procNodes = workspaceXml.getElementsByTagName('SystemProcess');
            for (let i=0; i<procNodes.length; i++) {
                let process = <SystemProcess>this.loadProcessDefinition(workspace, procNodes[i], typesByName, true);
                systemProcesses[process.name] = process;
            }

            procNodes = workspaceXml.getElementsByTagName('RequiredProcess');
            for (let i=0; i<procNodes.length; i++) {
                let process = <UserProcess>this.loadProcessDefinition(workspace, procNodes[i], typesByName, false);
                userProcesses[process.name] = process;
            }

            workspace.setDefinitions(typesByName, systemProcesses, userProcesses);
        }
        private static loadType(typeNode, workspace, typesByName) {
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
                if (typesByName.hasOwnProperty(extendsName))
                    extendsType = typesByName[extendsName];
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
        private static loadProcessDefinition(workspace, procNode, typesByName, isSystemProcess): Process {
            let name = procNode.getAttribute('name');
            
            let inputs: Variable[] = [];
            let outputs: Variable[] = [];
            let returnPaths: string[] = [];
            let procTypeName = isSystemProcess ? 'system' : 'fixed';
            
            let paramNodes = procNode.getElementsByTagName('Input');
            this.loadParameters(workspace, typesByName, paramNodes, inputs, 'input', procTypeName);

            paramNodes = procNode.getElementsByTagName('Output');
            this.loadParameters(workspace, typesByName, paramNodes, outputs, 'output', procTypeName);
            
            let returnPathParents = procNode.getElementsByTagName('ReturnPaths');
            if (returnPathParents.length > 0) {
                let returnPathNodes = returnPathParents[0].getElementsByTagName('Path');
                
                let usedNames: {[key:string]:boolean} = {};
                for (let j=0; j<returnPathNodes.length; j++) {
                    let path = returnPathNodes[j].getAttribute('name');
                    
                    if (usedNames.hasOwnProperty(path))
                        workspace.showError('The \'' + name + '\' ' + procTypeName + ' process has two return paths with the same name: ' + name + '. Return path names must be unique within a process.');
                    else {
                        usedNames[path] = null;
                        returnPaths.push(path);    
                    }
                }
            }
                
            let process: Process;
            if (isSystemProcess)
                process = new SystemProcess(name, inputs, outputs, returnPaths);
            else {
                process = new UserProcess(name, inputs, outputs, [], returnPaths, true);
                (process as UserProcess).createDefaultSteps();
            }
            
            process.workspace = workspace;
            return process;
        }
        private static loadParameters(workspace: Workspace, typesByName: {[key:string]:Type}, paramNodes: HTMLCollection, parameters: Variable[], paramTypeName: string, procTypeName: string) {
            let usedNames: {[key:string]:boolean} = {};

            for (let i=0; i<paramNodes.length; i++) {
                let paramName = paramNodes[i].getAttribute('name');
                let paramTypeName = paramNodes[i].getAttribute('type');
                
                let paramType;
                if (typesByName.hasOwnProperty(paramTypeName))
                    paramType = typesByName[paramTypeName];
                else {
                    workspace.showError('The \'' + name + '\' ' + procTypeName + ' process has an ' + paramTypeName + ' (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
                    paramType = null;
                }    
                
                if (usedNames.hasOwnProperty(paramName))
                    workspace.showError('The \'' + name + '\' ' + procTypeName + ' process has two ' + paramTypeName + 's with the same name: ' + paramName + '. The names of ' + paramTypeName + 's must be unique within a process.');
                else {
                    usedNames[paramName] = null;
                    parameters.push(new Variable(paramName, paramType));
                }
            }
        }
    }
}