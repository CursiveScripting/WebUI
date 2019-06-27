import { DataField, Parameter, Process, ProcessStep, ReturnPath, StartStep, Step, StopStep, SystemProcess,
    UserProcess, Variable, Workspace } from '../data';

export class ProcessLoading {
    static loadProcesses(workspace: Workspace, processXml: HTMLElement) {
        let processNodes = processXml.getElementsByTagName('Process');
        let userProcesses = workspace.userProcesses;        
        let systemProcesses = workspace.systemProcesses;
        
        for (const processNode of processNodes) {
            const process = this.loadProcessDefinition(workspace, processNode);
            
            let existing = userProcesses.get(process.name);
            if (existing !== undefined) {
                if (existing.fixedSignature) {
                    existing.variables = process.variables;
                    existing.folder = process.folder;
                    existing.description = process.description;
                }
                else {
                    workspace.showError(`There are two user processes with the same name: ${process.name}. Process names must be unique.`);
                }
                continue;
            }

            if (systemProcesses.has(process.name)) {
                workspace.showError(`A user process has the same name as a system processes: ${process.name}. Process names must be unique.`);
                continue;
            }

            userProcesses.set(process.name, process);
        }

        for (const processNode of processNodes) {
            this.loadProcessSteps(workspace, processNode, userProcesses, systemProcesses);
        }
    }

    private static loadProcessDefinition(workspace: Workspace, processNode: Element): UserProcess {
        let processName = processNode.getAttribute('name')!;
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
        for (const paramNode of paramNodes) {
            if (paramNode.parentElement !== processNode) {
                continue;
            }

            let returnPathName = paramNode.getAttribute('name')!;
            if (returnPathName !== '' && !usedNames.hasOwnProperty(returnPathName)) {
                returnPaths.push(returnPathName);
            }
        }

        return new UserProcess(processName, inputs, outputs, variables, returnPaths, false, description, folder);
    }

    private static loadProcessParameters(
        workspace: Workspace,
        paramNodes: HTMLCollectionOf<Element>,
        dataFields: DataField[],
        paramTypeName: 'input' | 'output' | 'variable'
    ) {
        const isVariable = paramTypeName === 'variable';
        const isInput = paramTypeName === 'input';

        for (const node of paramNodes) {
            let paramName = node.getAttribute('name')!;
            let typeName = node.getAttribute('type')!;
            let dataType = workspace.types.get(typeName);

            if (dataType === undefined) {
                workspace.showError(`The ${paramName} ${paramTypeName} has an invalid type: ${typeName}. That type doesn't exist in this workspace.`);
                continue;
            }

            let dataField: DataField;
            if (isVariable) {
                let x = parseInt(node.getAttribute('x')!);
                let y = parseInt(node.getAttribute('y')!);
                dataField = new Variable(paramName, dataType, x, y);
            }
            else {
                dataField = new Parameter(paramName, dataType, isInput);
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
        userProcesses: Map<string, UserProcess>,
        systemProcesses: Map<string, SystemProcess>
    ) {
        let name = processNode.getAttribute('name')!;

        let process = userProcesses.get(name);
        if (process === undefined) {
            return;
        }

        process.steps.clear();
        let returnPathsToProcess: [Step, Element][] = [];

        const startNodes = processNode.getElementsByTagName('Start');
        for (const stepNode of startNodes) {
            let id = stepNode.getAttribute('ID')!;
            let x = parseInt(stepNode.getAttribute('x')!);
            let y = parseInt(stepNode.getAttribute('y')!);

            let step = new StartStep(id, process, x, y);
            this.loadStepOutputs(workspace, process, step, stepNode);
            process.steps.set(id, step);
            returnPathsToProcess.push([step, stepNode]);
        }

        const stopNodes = processNode.getElementsByTagName('Stop');
        for (const stepNode of stopNodes) {
            let id = stepNode.getAttribute('ID')!;
            let x = parseInt(stepNode.getAttribute('x')!);
            let y = parseInt(stepNode.getAttribute('y')!);

            let returnPath: string | null;
            if (stepNode.hasAttribute('name')) {
                returnPath = stepNode.getAttribute('name')!;
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
            process.steps.set(id, step);
            returnPathsToProcess.push([step, stepNode]);
        }

        const stepNodes = processNode.getElementsByTagName('Step');
        for (const stepNode of stepNodes) {
            let id = stepNode.getAttribute('ID')!;
            let x = parseInt(stepNode.getAttribute('x')!);
            let y = parseInt(stepNode.getAttribute('y')!);

            let childProcess: Process | null;
            let childProcessName = stepNode.getAttribute('process')!;
            if (systemProcesses.has(childProcessName)) {
                childProcess = systemProcesses.get(childProcessName)!;
            }
            else if (userProcesses.has(childProcessName)) {
                childProcess = userProcesses.get(childProcessName)!;
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
            process.steps.set(id, step);
            returnPathsToProcess.push([step, stepNode]);
        }
        
        for (let step of returnPathsToProcess) {
            this.loadReturnPaths(workspace, step[0], step[1], process);
        }
    }

    private static loadStepInputs(workspace: Workspace, process: UserProcess, step: Step, stepNode: Element) {
        let inputNodes = stepNode.getElementsByTagName('Input');
        let inputs = step.inputs;
        for (const mapNode of inputNodes) {
            let paramName = mapNode.getAttribute('name')!;
            let sourceName = mapNode.getAttribute('source')!;

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
    }

    private static loadStepOutputs(workspace: Workspace, process: UserProcess, step: Step, stepNode: Element) {
        let outputNodes = stepNode.getElementsByTagName('Output');
        let outputs = step.outputs;
        
        for (const mapNode of outputNodes) {
            let paramName = mapNode.getAttribute('name')!;
            let destinationName = mapNode.getAttribute('destination')!;

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
        
        for (const returnPathNode of returnPathNodes) {
            let targetStepID = returnPathNode.getAttribute('targetStepID')!;
            let targetStep = process.steps.get(targetStepID);

            if (targetStep === undefined) {
                continue;
            }

            let returnPath = new ReturnPath(step, targetStep, null);
            step.returnPaths.push(returnPath);
            targetStep.incomingPaths.push(returnPath);
        }

        returnPathNodes = stepNode.getElementsByTagName('NamedReturnPath');

        for (const returnPathNode of returnPathNodes) {
            let targetStepID = returnPathNode.getAttribute('targetStepID')!;
            let targetStep = process.steps.get(targetStepID);

            if (targetStep === undefined) {
                continue;
            }

            let name = returnPathNode.getAttribute('name');
            let returnPath = new ReturnPath(step, targetStep, name);
            step.returnPaths.push(returnPath);
            targetStep.incomingPaths.push(returnPath);
        }
    }
}