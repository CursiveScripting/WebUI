import { DataField, Dictionary, Parameter, Process, ProcessStep, ReturnPath, StartStep, Step, StopStep, SystemProcess,
    UserProcess, Variable, Workspace } from '../data';

export class ProcessLoading {
    static loadProcesses(workspace: Workspace, processXml: HTMLElement) {
        let processNodes = processXml.getElementsByTagName('Process');
        let userProcesses = workspace.userProcesses;        
        let systemProcesses = workspace.systemProcesses;
        
        for (let i = 0; i < processNodes.length; i++) {
            let process = this.loadProcessDefinition(workspace, processNodes[i]);
            
            let existing = userProcesses.getByName(process.name);
            if (existing !== null) {
                if (existing.fixedSignature) {
                    existing.variables = process.variables;
                    existing.folder = process.folder;
                    existing.description = process.description;
                }
                else {
                    workspace.showError(`There are two user processes with the same name: ${name}. Process names must be unique.`);
                }
                continue;
            }

            if (systemProcesses.contains(process.name)) {
                workspace.showError(`A user process has the same name as a system processes: ${name}. Process names must be unique.`);
                continue;
            }

            userProcesses.add(process.name, process);
        }

        for (let i = 0; i < processNodes.length; i++) {
            this.loadProcessSteps(workspace, processNodes[i], userProcesses, systemProcesses);
        }
    }

    private static loadProcessDefinition(workspace: Workspace, processNode: Element): UserProcess {
        let processName = processNode.getAttribute('name') as string;
        let folder = processNode.hasAttribute('folder') ? processNode.getAttribute('folder') : null;
        let descNodes = processNode.getElementsByTagName('Description');
        let description = descNodes.length > 0 ? descNodes[0].innerHTML : '';

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
        let usedNames: {[key: string]: boolean} = {};
        paramNodes = processNode.getElementsByTagName('ReturnPath');
        for (let i = 0; i < paramNodes.length; i++) {
            let paramNode = paramNodes[i];
            if (paramNode.parentElement !== processNode) {
                continue;
            }

            let returnPathName = paramNode.getAttribute('name') as string;
            if (returnPathName !== '' && !usedNames.hasOwnProperty(returnPathName)) {
                returnPaths.push(returnPathName);
            }
        }

        return new UserProcess(processName, inputs, outputs, variables, returnPaths, false, description, folder);
    }

    private static loadProcessParameters(
        workspace: Workspace,
        paramNodes: NodeListOf<Element>,
        dataFields: DataField[],
        paramTypeName: 'input' | 'output' | 'variable'
    ) {
        for (let i = 0; i < paramNodes.length; i++) {
            let node = paramNodes[i];
            let paramName = node.getAttribute('name') as string;
            let typeName = node.getAttribute('type') as string;
            let dataType = workspace.types.getByName(typeName);

            if (dataType === null) {
                workspace.showError(`The ${paramName} ${paramTypeName} has an invalid type: ${name}. That type doesn't exist in this workspace.`);
                continue;
            }

            let dataField: DataField;
            if (paramTypeName === 'variable') {
                let x = node.hasAttribute('x') ? parseInt(node.getAttribute('x') as string) : -1;
                let y = node.hasAttribute('y') ? parseInt(node.getAttribute('y') as string) : -1;
                dataField = new Variable(paramName, dataType, x, y);
            }
            else {
                dataField = new Parameter(paramName, dataType);
            }

            if (node.hasAttribute('initialValue')) {
                let initial = node.getAttribute('initialValue');
                dataField.initialValue = initial;
            }

            dataFields.push(dataField);
        }
    }

    private static loadProcessSteps(
        workspace: Workspace,
        processNode: Element,
        userProcesses: Dictionary<UserProcess>,
        systemProcesses: Dictionary<SystemProcess>
    ) {
        let name = processNode.getAttribute('name') as string;

        let process = userProcesses.getByName(name);
        if (process === null) {
            return;
        }

        process.steps.clear();
        let returnPathsToProcess: [Step, Element][] = [];

        let startNodes = processNode.getElementsByTagName('Start');
        for (let i = 0; i < startNodes.length; i++) {
            let stepNode = startNodes[i];
            let id = stepNode.getAttribute('ID') as string;
            let x = parseInt(stepNode.getAttribute('x') as string);
            let y = parseInt(stepNode.getAttribute('y') as string);

            let step = new StartStep(id, process, x, y);
            this.loadStepOutputs(workspace, process, step, stepNode);
            process.steps.add(id, step);
            returnPathsToProcess.push([step, stepNode]);
        }

        let stopNodes = processNode.getElementsByTagName('Stop');
        for (let i = 0; i < stopNodes.length; i++) {
            let stepNode = stopNodes[i];
            let id = stepNode.getAttribute('ID') as string;
            let x = parseInt(stepNode.getAttribute('x') as string);
            let y = parseInt(stepNode.getAttribute('y') as string);

            let returnPath: string | null;
            if (stepNode.hasAttribute('name')) {
                returnPath = stepNode.getAttribute('name') as string;
                if (process.returnPaths.indexOf(returnPath) === -1) {
                    workspace.showError(`Step ${id} of the "${process.name}" process uses an unspecified return path name: ${name}.`
                     + ' That name isn\'t a return path on this process.');
                }
            }
            else {
                returnPath = null;
                if (process.returnPaths.length > 0) {
                    workspace.showError(`Step ${id} of the "${process.name}" process has no return path name.`
                     + ' This process uses named return paths, so a name is required.');
                }
            }

            let step = new StopStep(id, process, returnPath, x, y);
            this.loadStepInputs(workspace, process, step, stepNode);
            process.steps.add(id, step);
            returnPathsToProcess.push([step, stepNode]);
        }

        let stepNodes = processNode.getElementsByTagName('Step');
        for (let i = 0; i < stepNodes.length; i++) {
            let stepNode = stepNodes[i];
            let id = stepNode.getAttribute('ID') as string;
            let x = parseInt(stepNode.getAttribute('x') as string);
            let y = parseInt(stepNode.getAttribute('y') as string);

            let childProcess: Process | null;
            let childProcessName = stepNode.getAttribute('process') as string;
            if (systemProcesses.contains(childProcessName)) {
                childProcess = systemProcesses.getByName(childProcessName);
            }
            else if (userProcesses.contains(childProcessName)) {
                childProcess = userProcesses.getByName(childProcessName);
            }
            else {
                childProcess = null;
            }

            if (childProcess === null) {
                workspace.showError(`Step ${id} of the "${process.name}" process wraps an unknown process: ${name}.`
                 + ' That process doesn\'t exist in this workspace.');
                continue;
            }

            let step = new ProcessStep(id, childProcess, process, x, y);
            this.loadStepInputs(workspace, process, step, stepNode);
            this.loadStepOutputs(workspace, process, step, stepNode);
            process.steps.add(id, step);
            returnPathsToProcess.push([step, stepNode]);
        }
        
        for (let step of returnPathsToProcess) {
            this.loadReturnPaths(workspace, step[0], step[1], process);
        }
    }

    private static loadStepInputs(workspace: Workspace, process: UserProcess, step: Step, stepNode: Element) {
        let inputNodes = stepNode.getElementsByTagName('MapInput');
        let inputs = step.inputs;
        for (let i = 0; i < inputNodes.length; i++) {
            let mapNode = inputNodes[i];

            let paramName = mapNode.getAttribute('name') as string;
            let sourceName = mapNode.getAttribute('source') as string;

            let parameter = this.getNamed(inputs, paramName) as Parameter;
            let source = this.getNamed(process.variables, sourceName) as Variable;

            if (parameter === null) {
                workspace.showError(`Step ${step.uniqueID} of the "${process.name}" process tries to map a non-existant output: ${paramName}`);
                continue;
            }
            if (source === null) {
                workspace.showError(`Step ${step.uniqueID} of the "${process.name}" process tries to map an input from a non-existant`
                 + ` variable: ${sourceName}`);
                continue;
            }

            parameter.link = source;
            source.links.push(parameter);
        }

        inputNodes = stepNode.getElementsByTagName('FixedInput');
        for (let i = 0; i < inputNodes.length; i++) {
            let mapNode = inputNodes[i];

            let paramName = mapNode.getAttribute('name') as string;
            let value = mapNode.getAttribute('value') as string;

            let parameter = this.getNamed(inputs, paramName) as Parameter;
            if (parameter === null) {
                continue;
            }

            if (!parameter.type.isValid(value)) {
                continue;
            }
            
            parameter.initialValue = value;
        }
    }

    private static loadStepOutputs(workspace: Workspace, process: UserProcess, step: Step, stepNode: Element) {
        let outputNodes = stepNode.getElementsByTagName('MapOutput');
        let outputs = step.outputs;
        for (let i = 0; i < outputNodes.length; i++) {
            let mapNode = outputNodes[i];
            
            let paramName = mapNode.getAttribute('name') as string;
            let destinationName = mapNode.getAttribute('destination') as string;

            let parameter = this.getNamed(outputs, paramName) as Parameter;
            let destination = this.getNamed(process.variables, destinationName) as Variable;

            if (parameter === null) {
                workspace.showError(`Step ${step.uniqueID} of the "${process.name}" process tries to map a non-existant output: ${paramName}`);
                continue;
            }
            if (destination === null) {
                workspace.showError(`Step ${step.uniqueID} of the "${process.name}" process tries to map an output to a non-existant`
                    + ` variable: ${destinationName}`);
                continue;
            }
            parameter.link = destination;
            destination.links.push(parameter);
        }
    }

    private static getNamed(options: DataField[], name: string) {
        for (let option of options) {
            if (option.name === name) {
                return option;
            }
        }

        return null;
    }

    private static loadReturnPaths(workspace: Workspace, step: Step, stepNode: Element, process: UserProcess) {
        let returnPathNodes = stepNode.getElementsByTagName('ReturnPath');
        
        for (let i = 0; i < returnPathNodes.length; i++) {
            let returnPathNode = returnPathNodes[i];
            let targetStepID = returnPathNode.getAttribute('targetStepID') as string;
            let targetStep = process.steps.getByName(targetStepID);

            if (targetStep === null) {
                continue;
            }

            let returnPath = new ReturnPath(step, targetStep, null);
            // returnPath.onlyPath = true;
            step.returnPaths.push(returnPath);
            targetStep.incomingPaths.push(returnPath);
        }

        returnPathNodes = stepNode.getElementsByTagName('NamedReturnPath');

        for (let i = 0; i < returnPathNodes.length; i++) {
            let returnPathNode = returnPathNodes[i];
            let targetStepID = returnPathNode.getAttribute('targetStepID') as string;
            let targetStep = process.steps.getByName(targetStepID);

            if (targetStep === null) {
                continue;
            }

            let name = returnPathNode.getAttribute('name');
            let returnPath = new ReturnPath(step, targetStep, name);
            // returnPath.onlyPath = false;
            step.returnPaths.push(returnPath);
        }
    }
}