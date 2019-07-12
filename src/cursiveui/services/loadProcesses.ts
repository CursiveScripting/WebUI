import { IWorkspaceState } from '../workspaceState/IWorkspaceState';
import { createMap, isString } from './DataFunctions';
import { usesOutputs } from './StepFunctions';
import { IUserProcess } from '../workspaceState/IUserProcess';
import { IVariable } from '../workspaceState/IVariable';
import { IStep, StepType } from '../workspaceState/IStep';
import { IProcess } from '../workspaceState/IProcess';
import { IParameter } from '../workspaceState/IParameter';
import { IStartStep } from '../workspaceState/IStartStep';
import { IStopStep } from '../workspaceState/IStopStep';
import { IProcessStep } from '../workspaceState/IProcessStep';
import { IType } from '../workspaceState/IType';
import { isUserProcess } from './ProcessFunctions';

export function loadProcesses(workspace: IWorkspaceState, processData: Document | string) {
    const rootElement = isString(processData)
        ? new DOMParser().parseFromString(processData, 'application/xml').documentElement
        : processData.firstChild as HTMLElement;

    return loadProcessesFromElement(workspace, rootElement);
}

function loadProcessesFromElement(workspace: IWorkspaceState, processData: HTMLElement) {
    const processNodes = processData.getElementsByTagName('Process');
    const processesByName = createMap(workspace.processes, p => p.name);
    const typesByName = createMap(workspace.types, t => t.name);

    for (const processNode of processNodes) {
        const process = loadProcessDefinition(typesByName, processNode);
        
        const existing = processesByName.get(process.name);
        if (existing !== undefined) {
            if (isUserProcess(existing)) {
                if (existing.fixedSignature) {
                    existing.variables = process.variables;
                    existing.folder = process.folder;
                    existing.description = process.description;
                }
                else {
                    throw new Error(`There are two user processes with the same name: ${process.name}. Process names must be unique.`);
                }
            }
            else {
                throw new Error(`A user process has the same name as a system processes: ${process.name}. Process names must be unique.`);
            }
            continue;
        }

        if (!processesByName.has(process.name)) {
            processesByName.set(process.name, process);
            workspace.processes.push(process);
        }
    }

    for (const processNode of processNodes) {
        loadProcessSteps(processNode, processesByName);
    }
}

function loadProcessDefinition(typesByName: Map<string, IType>, processNode: Element): IUserProcess {
    const name = processNode.getAttribute('name')!;
    const folder = processNode.hasAttribute('folder') ? processNode.getAttribute('folder') : null;
    const descNodes = processNode.getElementsByTagName('Description');
    const description = descNodes.length > 0 ? descNodes[0].innerHTML : '';

    const inputs: IParameter[] = [];
    let paramNodes = processNode.getElementsByTagName('Input');
    loadProcessParameters(typesByName, paramNodes, inputs, 'input');

    const outputs: IParameter[] = [];
    paramNodes = processNode.getElementsByTagName('Output');
    loadProcessParameters(typesByName, paramNodes, outputs, 'output');

    const variables: IVariable[] = [];
    paramNodes = processNode.getElementsByTagName('Variable');
    loadProcessParameters(typesByName, paramNodes, variables, 'variable');

    const returnPaths: string[] = [];
    const usedNames = new Set<string>();
    paramNodes = processNode.getElementsByTagName('ReturnPath');
    for (const paramNode of paramNodes) {
        if (paramNode.parentElement !== processNode) {
            continue;
        }

        const returnPathName = paramNode.getAttribute('name')!;
        if (returnPathName !== '' && !usedNames.has(returnPathName)) { // TODO: was null, not ''
            returnPaths.push(returnPathName);
        }
    }

    return {
        name,
        description,
        folder,
        fixedSignature: false,
        isSystem: false,
        inputs,
        outputs,
        returnPaths,
        steps: [],
        variables,
    };
}

function loadProcessParameters(
    typesByName: Map<string, IType>,
    paramNodes: HTMLCollectionOf<Element>,
    dataFields: IParameter[],
    paramTypeName: 'input' | 'output' | 'variable'
) {
    const isVariable = paramTypeName === 'variable';

    for (const node of paramNodes) {
        const paramName = node.getAttribute('name')!;
        const typeName = node.getAttribute('type')!;

        if (!typesByName.has(typeName)) {
            throw new Error(`The ${paramName} ${paramTypeName} has an invalid type: ${typeName}. That type doesn't exist in this workspace.`);
        }

        let dataField: IVariable | IParameter;
        if (isVariable) {
            dataField = {
                name: paramName,
                typeName: typeName,
                fromLinks: [],
                toLinks: [],
                x: parseInt(node.getAttribute('x')!),
                y: parseInt(node.getAttribute('y')!),
                initialValue: node.getAttribute('initialValue'),
            };
        }
        else {
            dataField = {
                name: paramName,
                typeName: typeName,   
            }
        }

        dataFields.push(dataField);
    }
}

function loadProcessSteps(
    processNode: Element,
    processesByName: Map<string, IProcess>
) {
    const name = processNode.getAttribute('name')!;

    const process = processesByName.get(name);
    if (process === undefined || !isUserProcess(process)) {
        return;
    }

    const stepsById = new Map<string, IStep>();

    const startNodes = processNode.getElementsByTagName('Start');
    for (const stepNode of startNodes) {
        const id = stepNode.getAttribute('ID')!;

        const step: IStartStep = {
            uniqueId: id,
            stepType: StepType.Start,
            outputs: loadStepOutputs(id, process, process.inputs, stepNode),
            returnPaths: loadReturnPaths(stepNode),
            x: parseInt(stepNode.getAttribute('x')!),
            y: parseInt(stepNode.getAttribute('y')!),
        };

        stepsById.set(id, step);
    }

    const stopNodes = processNode.getElementsByTagName('Stop');
    for (const stepNode of stopNodes) {
        const id = stepNode.getAttribute('ID')!;

        let returnPath: string | null;
        if (stepNode.hasAttribute('name')) {
            returnPath = stepNode.getAttribute('name')!;
            if (process.returnPaths.indexOf(returnPath) === -1) {
                throw new Error(`Step ${id} of the "${process.name}" process uses an unspecified return path name: ${name}.`
                    + ' That name isn\'t a return path on this process.');
            }
        }
        else {
            returnPath = null;
            if (process.returnPaths.length > 0) {
                throw new Error(`Step ${id} of the "${process.name}" process has no return path name.`
                    + ' This process uses named return paths, so a name is required.');
            }
        }

        const step: IStopStep = {
            uniqueId: id,
            stepType: StepType.Stop,
            inputs: loadStepInputs(id, process, process.outputs, stepNode),
            x: parseInt(stepNode.getAttribute('x')!),
            y: parseInt(stepNode.getAttribute('y')!),
            returnPath,
        };
        
        stepsById.set(id, step);
    }

    const stepNodes = processNode.getElementsByTagName('Step');
    for (const stepNode of stepNodes) {
        const id = stepNode.getAttribute('ID')!;

        const childProcessName = stepNode.getAttribute('process')!;
        const childProcess = processesByName.get(childProcessName);
        
        if (childProcess === undefined) {
            throw new Error(`Step ${id} of the "${process.name}" process wraps an unknown process: ${name}.`
                + ' That process doesn\'t exist in this workspace.');
        }

        const isUser = isUserProcess(childProcess);
        
        const step: IProcessStep = {
            uniqueId: id,
            stepType: isUser ? StepType.UserProcess : StepType.SystemProcess,
            processName: childProcess.name,
            inputs: loadStepInputs(id, process, childProcess.inputs, stepNode),
            outputs: loadStepOutputs(id, process, childProcess.outputs, stepNode),
            returnPaths: loadReturnPaths(stepNode),
            x: parseInt(stepNode.getAttribute('x')!),
            y: parseInt(stepNode.getAttribute('y')!),
        }

        stepsById.set(id, step);
    }
    
    verifyReturnPaths(process.name, stepsById);
    
    process.steps = Array.from(stepsById.values());
}

function loadStepInputs(stepId: string, process: IUserProcess, inputs: IParameter[], stepNode: Element) {
    return loadStepParameters(stepId, process, inputs, stepNode, 'input', 'Input', 'source');
}

function loadStepOutputs(stepId: string, process: IUserProcess, outputs: IParameter[], stepNode: Element) {
    return loadStepParameters(stepId, process, outputs, stepNode, 'output', 'Output', 'destination');
}

function loadStepParameters(
    stepId: string,
    process: IUserProcess,
    parameters: IParameter[],
    stepNode: Element,
    parameterTypeName: string,
    parameterElementTagName: string,
    linkAttributeName: string
) {
    const sourceNodes = stepNode.getElementsByTagName(parameterElementTagName);
    const results: Record<string, string> = {};
    
    for (const sourceNode of sourceNodes) {
        const paramName = sourceNode.getAttribute('name')!;
        const destinationName = sourceNode.getAttribute(linkAttributeName)!;

        const parameter = parameters.find(o => o.name === paramName);
        const destination = process.variables.find(v => v.name === destinationName);

        if (parameter === undefined) {
            throw new Error(`Step ${stepId} of the "${process.name}" process tries to map a non-existant ${parameterTypeName}: ${paramName}`);
        }
        if (destination === undefined) {
            throw new Error(`Step ${stepId} of the "${process.name}" process tries to map an ${parameterTypeName} to a non-existant variable: ${destinationName}`);
        }

        results[parameter.name] = destination.name;
    }

    return results;
}

function loadReturnPaths(stepNode: Element) {
    let returnPathNodes = stepNode.getElementsByTagName('ReturnPath');
    const returnValue: Record<string, string> = {};

    for (const returnPathNode of returnPathNodes) {
        const targetStepID = returnPathNode.getAttribute('targetStepID')!;

        returnValue[''] = targetStepID;
        return returnValue; // can only ever have one non-named return path
    }

    returnPathNodes = stepNode.getElementsByTagName('NamedReturnPath');

    for (const returnPathNode of returnPathNodes) {
        const name = returnPathNode.getAttribute('name')!;
        const targetStepID = returnPathNode.getAttribute('targetStepID')!;

        returnValue[name] = targetStepID;
    }

    return returnValue;
}

function verifyReturnPaths(processName: string, stepsById: Map<string, IStep>) {
    for (const [, step] of stepsById) {
        if (usesOutputs(step)) {
            for (const path in step.returnPaths) {
                const destinationStepId = step.returnPaths[path];

                if (!stepsById.has(destinationStepId)) {
                    throw new Error(`Step ${step.uniqueId} of process "${processName}" links a return path to an unknown step: ${destinationStepId}.`);
                }
            }
        }
    }
}