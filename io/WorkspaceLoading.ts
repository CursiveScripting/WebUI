namespace Cursive {
    export class WorkspaceLoading {
        static loadWorkspace(workspace: Workspace, workspaceXml: HTMLElement) {
            let types: Type[] = [];
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

                types.push(type);
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

            workspace.setDefinitions(types, systemProcesses, userProcesses);
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
            
            let usedNames: {[key:string]:boolean} = {};
            let paramNodes = procNode.getElementsByTagName('Input');
            for (let j=0; j<paramNodes.length; j++) {
                let paramName = paramNodes[j].getAttribute('name');
                let paramTypeName = paramNodes[j].getAttribute('type');
                
                let paramType;
                if (typesByName.hasOwnProperty(paramTypeName))
                    paramType = typesByName[paramTypeName];
                else {
                    workspace.showError('The \'' + name + '\' ' + procTypeName + ' process has an input (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
                    paramType = null;
                }    
                
                if (usedNames.hasOwnProperty(paramName))
                    workspace.showError('The \'' + name + '\' ' + procTypeName + ' process has two inputs with the same name: ' + paramName + '. Input names must be unique within a process.');
                else {
                    usedNames[paramName] = null;
                    inputs.push(new Variable(paramName, paramType));
                }
            }
            
            usedNames = {};
            paramNodes = procNode.getElementsByTagName('Output');
            for (let j=0; j<paramNodes.length; j++) {
                let paramName = paramNodes[j].getAttribute('name');
                let paramTypeName = paramNodes[j].getAttribute('type');
                
                let paramType;
                if (typesByName.hasOwnProperty(paramTypeName))
                    paramType = typesByName[paramTypeName];
                else {
                    workspace.showError('The \'' + name + '\' ' + procTypeName + ' function has an output (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
                    paramType = null;
                }
                
                if (usedNames.hasOwnProperty(paramName))
                    workspace.showError('The \'' + name + '\' ' + procTypeName + ' function has two outputs with the same name: ' + paramName + '. Output names must be unique within a process.');
                else {
                    usedNames[paramName] = null;
                    outputs.push(new Variable(paramName, paramType));
                }
            }
            
            let returnPathParents = procNode.getElementsByTagName('ReturnPaths');
            if (returnPathParents.length > 0) {
                let returnPathNodes = returnPathParents[0].getElementsByTagName('Path');
                
                usedNames = {};
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
                process = new UserProcess(name, inputs, outputs, returnPaths, true);
                (process as UserProcess).createDefaultSteps();
            }
            
            process.workspace = workspace;
            return process;
        }
    }
}