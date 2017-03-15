namespace Cursive {
    export class ProcessLoading {
        static loadProcesses(workspace: Workspace, processXml: HTMLElement) {
            let processNodes = processXml.getElementsByTagName('Process');
            let userProcesses = workspace.userProcesses;        
            let systemProcesses = workspace.systemProcesses;
            
            for (let i=0; i<processNodes.length; i++) {
                let process = this.loadProcessDefinition(workspace, processNodes[i]);
                
                let existing = userProcesses.getByName(process.name);
                if (existing !== undefined) {
                    if (existing.fixedSignature)
                        existing.variables = process.variables;
                    else
                        workspace.showError('There are two user processes with the same name: ' + name + '. Process names must be unique.');
                    continue;
                }

                if (systemProcesses.contains(process.name)) {
                    workspace.showError('A user process has the same name as a system processes: ' + name + '. Process names must be unique.');
                    continue;
                }

                process.workspace = workspace;
                userProcesses.add(process.name, process);
            }

            for (let i=0; i<processNodes.length; i++) {
                this.loadProcessSteps(workspace, processNodes[i], userProcesses, systemProcesses);
            }

            workspace.validate();
        }

        private static loadProcessDefinition(workspace: Workspace, processNode: Element): UserProcess {
            let processName = processNode.getAttribute('name');

            let inputs: Parameter[] = [];
            let paramNodes = processNode.getElementsByTagName('Input');
            this.loadProcessParameters(workspace, paramNodes, inputs, 'input');

            let outputs: Parameter[] = [];
            paramNodes = processNode.getElementsByTagName('Output');
            this.loadProcessParameters(workspace, paramNodes, outputs, 'output');

            let variables: Variable[] = [];
            paramNodes = processNode.getElementsByTagName('Variable');
            this.loadProcessParameters(workspace, paramNodes, variables, 'variable');

            let returnPaths: string[] = [];
            let usedNames: {[key:string]:boolean} = {};
            let stopNodes = processNode.getElementsByTagName('Stop');
            for (let i=0; i<stopNodes.length; i++) {
                let stopNode = stopNodes[i];
                if (!stopNode.hasAttribute('name'))
                    continue;

                let stopName = stopNode.getAttribute('name');
                if (stopName !== '' && !usedNames.hasOwnProperty(stopName))
                    returnPaths.push(stopName);
            }

            return new UserProcess(processName, inputs, outputs, variables, returnPaths, false);
        }

        private static loadProcessParameters(workspace: Workspace, paramNodes, dataFields: DataField[], paramTypeName: 'input' | 'output' | 'variable') {
            for (let i=0; i<paramNodes.length; i++) {
                let node = paramNodes[i];
                let paramName = node.getAttribute('name');
                let typeName = node.getAttribute('type');
                let dataType = workspace.types.getByName(typeName);

                if (dataType === null) {
                    workspace.showError('The ' + paramName + ' ' + paramTypeName + ' has an invalid type: ' + name + '. That type doesn\'t exist in this workspace.');
                    continue;
                }

                let dataField: DataField;
                if (paramTypeName == 'variable')
                    dataField = new Variable(paramName, dataType);
                else
                    dataField = new Parameter(paramName, dataType);

                if (node.hasAttribute('initialValue')) {
                    let initial = node.getAttribute('initialValue');
                    dataField.initialValue = initial;
                }

                dataFields.push(dataField);
            }
        }

        private static loadProcessSteps(workspace: Workspace, processNode: Element, userProcesses: Dictionary<UserProcess>, systemProcesses: Dictionary<SystemProcess>) {
            let name = processNode.getAttribute('name');
            if (!userProcesses.contains(name))
                return;
            
            let process = userProcesses.getByName(name);
            process.steps = [];
            let stepsByID: {[key: number]: Step} = {};
            let returnPathsToProcess: [Step, Element][] = [];

            let startNodes = processNode.getElementsByTagName('Start');
            for (let i=0; i<startNodes.length; i++) {
                let stepNode = startNodes[i];
                let id = parseInt(stepNode.getAttribute('ID'));
                let x = parseInt(stepNode.getAttribute('x'));
                let y = parseInt(stepNode.getAttribute('y'));

                let step = new StartStep(id, process, x, y);
                this.loadStepOutputs(workspace, process, step, stepNode);
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
                this.loadStepInputs(workspace, process, step, stepNode);
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
                if (systemProcesses.contains(childProcessName))
                    childProcess = systemProcesses.getByName(childProcessName);
                else if (userProcesses.contains(childProcessName))
                    childProcess = userProcesses.getByName(childProcessName);
                else {
                    workspace.showError('Step ' + id + ' of the "' + process.name + '" process wraps an unknown process: ' + name + '. That process doesn\'t exist in this workspace.');
                    continue;
                }

                process.noteUsedStepID(id);
                let step = new ProcessStep(id, childProcess, process, x, y);
                this.loadStepInputs(workspace, process, step, stepNode);
                this.loadStepOutputs(workspace, process, step, stepNode);
                process.steps.push(step);
                stepsByID[step.uniqueID] = step;
                returnPathsToProcess.push([step, stepNode]);
            }
            
            for (let step of returnPathsToProcess) {
                this.loadReturnPaths(workspace, step[0], step[1], stepsByID);
            }
        }

        private static loadStepInputs(workspace: Workspace, process: UserProcess, step: Step, stepNode: Element) {
            let inputNodes = stepNode.getElementsByTagName('MapInput');
            let inputs = step.inputs;
            for (let i = 0; i < inputNodes.length; i++) {
                let mapNode = inputNodes[i];

                let paramName = mapNode.getAttribute('name');
                let sourceName = mapNode.getAttribute('source');

                let parameter = this.getNamed(inputs, paramName) as Parameter;
                let source = this.getNamed(process.variables, sourceName) as Variable;

                if (parameter === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map a non-existant output: ' + paramName);
                    continue;
                }
                if (source === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map an input from a non-existant variable: ' + sourceName);
                    continue;
                }

                parameter.link = source;
                source.links.push(parameter);
            }

            inputNodes = stepNode.getElementsByTagName('FixedInput');
            for (let i = 0; i < inputNodes.length; i++) {
                let mapNode = inputNodes[i];

                let paramName = mapNode.getAttribute('name');
                let value = mapNode.getAttribute('value');

                let parameter = this.getNamed(inputs, paramName) as Parameter;
                if (parameter === null)
                    continue;

                if (!parameter.type.isValid(value))
                    continue;
                
                parameter.initialValue = value;
            }
        }

        private static loadStepOutputs(workspace: Workspace, process: UserProcess, step: Step, stepNode: Element) {
            let outputNodes = stepNode.getElementsByTagName('MapOutput');
            let outputs = step.outputs;
            for (let i = 0; i < outputNodes.length; i++) {
                let mapNode = outputNodes[i];
                
                let paramName = mapNode.getAttribute('name');
                let destinationName = mapNode.getAttribute('destination');

                let parameter = this.getNamed(outputs, paramName) as Parameter;
                let destination = this.getNamed(process.variables, destinationName) as Variable;

                if (parameter === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map a non-existant output: ' + paramName);
                    continue;
                }
                if (destination === null) {
                    workspace.showError('Step #' + step.uniqueID + ' of the "' + process.name + '" process tries to map an output to a non-existant variable: ' + destinationName);
                    continue;
                }
                parameter.link = destination;
                destination.links.push(parameter);
            }
        }

        private static getNamed(options: DataField[], name: string) {
            for (let option of options)
                if (option.name == name)
                    return option;

            return null;
        }

        private static loadReturnPaths(workspace: Workspace, step: Step, stepNode: Element, stepsByID: { [key: number]: Step }) {
            let returnPathNodes = stepNode.getElementsByTagName('ReturnPath');
            
            for (let i = 0; i < returnPathNodes.length; i++) {
                let returnPathNode = returnPathNodes[i];
                let targetStepID = returnPathNode.getAttribute('targetStepID');
                let targetStep = stepsByID[targetStepID];

                if (targetStep === undefined)
                    continue;

                let returnPath = new ReturnPath(step, targetStep, null);
                returnPath.onlyPath = true;
                step.returnPaths.push(returnPath);
            }

            returnPathNodes = stepNode.getElementsByTagName('NamedReturnPath');

            for (let i = 0; i < returnPathNodes.length; i++) {
                let returnPathNode = returnPathNodes[i];
                let targetStepID = returnPathNode.getAttribute('targetStepID');
                let targetStep = stepsByID[targetStepID];

                if (targetStep === undefined)
                    continue;

                let name = returnPathNode.getAttribute('name');
                let returnPath = new ReturnPath(step, targetStep, name);
                returnPath.onlyPath = false;
                step.returnPaths.push(returnPath);
            }
        }
    }
}