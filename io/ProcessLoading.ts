namespace Cursive {
    export class ProcessLoading {
        static loadProcesses(workspace: Workspace, processXml: HTMLElement) {
            let processNodes = processXml.getElementsByTagName('Process');
            let userProcessesByName = workspace.userProcesses;        
            let systemProcessesByName = workspace.systemProcesses;
            
            for (let i=0; i<processNodes.length; i++) {
                let process = this.loadProcessDefinition(workspace, processNodes[i]);
                
                if (userProcessesByName.hasOwnProperty(process.name)) {
                    workspace.showError('There are two user processes with the same name: ' + name + '. Process names must be unique.');
                    continue;
                }

                if (systemProcessesByName.hasOwnProperty(process.name)) {
                    workspace.showError('A user process has the same name as a system processes: ' + name + '. Process names must be unique.');
                    continue;
                }

                process.workspace = workspace;
                userProcessesByName[process.name] = process;
            }

            for (let i=0; i<processNodes.length; i++) {
                this.loadProcessSteps(workspace, processNodes[i], userProcessesByName, systemProcessesByName);
            }
        }

        private static loadProcessDefinition(workspace: Workspace, processNode: Element): UserProcess {
            let name = processNode.getAttribute('name');

            let inputs: Variable[] = [];
            let paramNodes = processNode.getElementsByTagName('Input');
            this.loadProcessParameters(workspace, paramNodes, inputs, 'input');

            let outputs: Variable[] = [];
            paramNodes = processNode.getElementsByTagName('Output');
            this.loadProcessParameters(workspace, paramNodes, outputs, 'output');

            let variables: Variable[] = [];
            paramNodes = processNode.getElementsByTagName('Variable');
            this.loadProcessParameters(workspace, paramNodes, variables, 'variable');

            let returnPaths: string[] = [];
            let usedNames: {[key:string]:boolean} = {};
            let stopNodes = processNode.getElementsByTagName('Stop');
            for (let i=0; i<stopNodes.length; i++) {
                let stopName = stopNodes[i].getAttribute('name');
                if (stopName !== '' && !usedNames.hasOwnProperty(stopName))
                    returnPaths.push(stopName);
            }
            
            return new UserProcess(name, inputs, outputs, variables, returnPaths, true);
        }

        private static loadProcessParameters(workspace: Workspace, paramNodes, parameters: Variable[], paramTypeName: string) {
            for (let i=0; i<paramNodes.length; i++) {
                let node = paramNodes[i];
                let paramName = node.getAttribute('name');
                let typeName = node.getAttribute('type');

                if (!workspace.types.hasOwnProperty(typeName)) {
                    workspace.showError('The ' + paramName + ' ' + paramTypeName + ' has an invalid type: ' + name + '. That type doesn\'t exist in this workspace.');
                    continue;
                }
                let type = workspace.types[typeName];

                let parameter = new Variable(name, type);

                if (node.hasAttribute('initialValue')) {
                    let initial = node.getAttribute('initialValue');
                    parameter.initialValue = initial;
                }

                return parameter;
            }
        }

        private static loadProcessSteps(workspace: Workspace, processNode: Element, userProcessesByName, systemProcessesByName) {
            let name = processNode.getAttribute('name');
            if (!userProcessesByName.hasOwnProperty(name))
                return;
            
            let process = userProcessesByName[name];
            let stepsByID: {[key: number]: Step} = {};
            let returnPathsToProcess: [Step, Element][] = [];

            let startNodes = processNode.getElementsByTagName('Start');
            for (let i=0; i<startNodes.length; i++) {
                let stepNode = startNodes[i];
                let id = parseInt(stepNode.getAttribute('ID'));
                let x = parseInt(stepNode.getAttribute('x'));
                let y = parseInt(stepNode.getAttribute('y'));

                let step = new StartStep(id, process, x, y);
                this.loadStepOutputs(workspace, process, process.inputs, step, stepNode);
                process.steps.push(step);
                stepsByID[step.uniqueID] = step;
                returnPathsToProcess.push([step, stepNode]);
            }

            let stopNodes = processNode.getElementsByTagName('Stop');
            for (let i=0; i<stopNodes.length; i++) {
                let stepNode = stopNodes[i];
                let id = parseInt(stepNode.getAttribute('ID'));
                let x = parseInt(stepNode.getAttribute('x'));
                let y = parseInt(stepNode.getAttribute('y'));
                let returnPath = stepNode.getAttribute('name');

                let step = new StopStep(id, process, returnPath, x, y);
                this.loadStepInputs(workspace, process, process.outputs, step, stepNode);
                process.steps.push(step);
                stepsByID[step.uniqueID] = step;
                returnPathsToProcess.push([step, stepNode]);
            }

            let stepNodes = processNode.getElementsByTagName('Step');
            for (let i=0; i<stepNodes.length; i++) {
                let stepNode = stepNodes[i];
                let id = parseInt(stepNode.getAttribute('ID'));
                let x = parseInt(stepNode.getAttribute('x'));
                let y = parseInt(stepNode.getAttribute('y'));

                let childProcess: Process;
                let childProcessName = stepNode.getAttribute('process');
                if (systemProcessesByName.hasOwnProperty(childProcessName))
                    childProcess = systemProcessesByName[childProcessName];
                else if (userProcessesByName.hasOwnProperty(childProcessName))
                    childProcess = userProcessesByName[childProcessName];
                else {
                    workspace.showError('Step ' + id + ' of the "' + process.name + '" process wraps an unknown process: ' + name + '. That process doesn\'t exist in this workspace.');
                    continue;
                }

                let step = new Step(id, childProcess, process, x, y);
                this.loadStepInputs(workspace, process, process.variables, step, stepNode);
                this.loadStepOutputs(workspace, process, process.variables, step, stepNode);
                process.steps.push(step);
                stepsByID[step.uniqueID] = step;
                returnPathsToProcess.push([step, stepNode]);
            }
            
            for (let step of returnPathsToProcess) {
                this.loadReturnPaths(workspace, step[0], step[1], stepsByID);
            }
        }

        private static loadStepInputs(workspace: Workspace, process: Process, sources: Variable[], step: Step, stepNode: Element) {
            // TODO: parse a number of MapInput and FixedInput nodes
            // sources could be this process's outputs or its variables
        }

        private static loadStepOutputs(workspace: Workspace, process: Process, destination: Variable[], step: Step, stepNode: Element) {
            // TODO: parse a number of MapOutput nodes
            // destinations could be this process's inputs or its variables
        }

        private static loadReturnPaths(workspace: Workspace, step: Step, stepNode: Element, stepsByID: {[key: number]: Step}) {
            // TODO: parse either a ReturnPath node or a number of NamedReturnPath nodes
        }
    }
}