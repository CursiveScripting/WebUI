import { IWorkspaceState } from '../state/IWorkspaceState';
import { createMap, isString } from './DataFunctions';
import { usesOutputs, usesInputs } from './StepFunctions';
import { IUserProcess } from '../state/IUserProcess';
import { IVariable } from '../state/IVariable';
import { IStep, StepType, IStepWithOutputs } from '../state/IStep';
import { IProcess } from '../state/IProcess';
import { IParameter } from '../state/IParameter';
import { IStartStep } from '../state/IStartStep';
import { IStopStep } from '../state/IStopStep';
import { IProcessStep } from '../state/IProcessStep';
import { IType } from '../state/IType';
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
        errors: [],
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
        const type = typesByName.get(typeName);

        if (type === undefined) {
            throw new Error(`The ${paramName} ${paramTypeName} has an invalid type: ${typeName}. That type doesn't exist in this workspace.`);
        }

        let dataField: IVariable | IParameter;
        if (isVariable) {
            dataField = {
                name: paramName,
                type,
                incomingLinks: [],
                outgoingLinks: [],
                x: parseInt(node.getAttribute('x')!),
                y: parseInt(node.getAttribute('y')!),
                initialValue: node.getAttribute('initialValue'),
            };
        }
        else {
            dataField = {
                name: paramName,
                type: type,
            }
        }

        dataFields.push(dataField);
    }
}

interface IIntermediateReturnPath {
    name: string | null;
    connection?: string;
}

interface IIntermediateStep {
    step: IStep;
    returnPaths?: IIntermediateReturnPath[];
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

    const stepsById = new Map<string, IIntermediateStep>();

    const startNodes = processNode.getElementsByTagName('Start');
    for (const stepNode of startNodes) {
        const id = stepNode.getAttribute('ID')!;

        const step: IStartStep = {
            uniqueId: id,
            stepType: StepType.Start,
            outputs: loadStepOutputs(id, process, process.inputs, stepNode),
            returnPaths: [],
            x: parseInt(stepNode.getAttribute('x')!),
            y: parseInt(stepNode.getAttribute('y')!),
        };

        stepsById.set(id, {
            step,
            returnPaths: loadReturnPaths(stepNode),
        });
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
            inputConnected: false,
        };
        
        stepsById.set(id, {
            step,
        });
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
            process: childProcess,
            inputs: loadStepInputs(id, process, childProcess.inputs, stepNode),
            outputs: loadStepOutputs(id, process, childProcess.outputs, stepNode),
            returnPaths: [],
            x: parseInt(stepNode.getAttribute('x')!),
            y: parseInt(stepNode.getAttribute('y')!),
            inputConnected: false,
        }

        stepsById.set(id, {
            step,
            returnPaths: loadReturnPaths(stepNode),
        });
    }
    
    validateReturnPaths(process.name, stepsById);
    
    process.steps = Array.from(stepsById.values()).map(s => s.step);
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
    const sourceNodesByName: Record<string, Element> = {};
    for (const sourceNode of sourceNodes) {
        const paramName = sourceNode.getAttribute('name')!;
        if (sourceNodesByName.hasOwnProperty(paramName)) {
            throw new Error(`Step ${stepId} of the "${process.name}" process tries to map the one ${parameterTypeName} multiple times: ${paramName}`);
        }
        sourceNodesByName[paramName] = sourceNode;
    }

    return parameters.map(p => {
        const sourceNode = sourceNodesByName[p.name];
        let variable: IVariable | undefined;

        if (sourceNode !== undefined) {
            const variableName = sourceNode.getAttribute(linkAttributeName);
            
            if (variableName !== null) {
                variable = process.variables.find(v => v.name === variableName);
                
                if (variable === undefined) {
                    throw new Error(`Step ${stepId} of the "${process.name}" process tries to map an ${parameterTypeName} to a non-existant variable: ${variableName}`);
                }
            }
        }

        const link = {
            ...p,
            connection: variable,
        };

        if (variable !== undefined) {
            variable.incomingLinks.push(link);
        }

        return link;
    });
}

function loadReturnPaths(stepNode: Element) {
    let returnPathNodes = stepNode.getElementsByTagName('ReturnPath');
    const returnPaths: IIntermediateReturnPath[] = [];

    for (const returnPathNode of returnPathNodes) {
        const targetStepID = returnPathNode.getAttribute('targetStepID')!;

        returnPaths.push({ name: null, connection: targetStepID});
        return returnPaths; // can only ever have one non-named return path
    }

    returnPathNodes = stepNode.getElementsByTagName('NamedReturnPath');

    for (const returnPathNode of returnPathNodes) {
        const name = returnPathNode.getAttribute('name')!;
        const targetStepID = returnPathNode.getAttribute('targetStepID')!;

        returnPaths.push({ name, connection: targetStepID});
    }

    return returnPaths;
}

function validateReturnPaths(
    processName: string,
    stepsById: Map<string, IIntermediateStep>
) {
    for (const [, intermediateStep] of stepsById) {
        const step = intermediateStep.step;
        if (usesOutputs(step) && intermediateStep.returnPaths !== undefined) {
            validateStepReturnPaths(step, intermediateStep.returnPaths, stepsById, processName);
        }
    }
}

function validateStepReturnPaths(
    step: IStepWithOutputs,
    returnPaths: IIntermediateReturnPath[],
    stepsById: Map<string, IIntermediateStep>,
    processName: string
) {
    for (const path of returnPaths) {
        let destinationStep: IIntermediateStep | undefined;
        
        if (path.connection !== undefined) {
            destinationStep = stepsById.get(path.connection);

            if (destinationStep === undefined) {
                throw new Error(`Step ${step.uniqueId} of process "${processName}" links a return path to an unknown step: ${path.connection}.`);
            }
            if (!usesInputs(destinationStep.step)) {
                throw new Error(`Step ${step.uniqueId} of process "${processName}" links a return path to an invalid step: ${path.connection}.`);
            }
            step.returnPaths.push({ name: path.name, connection: destinationStep.step });
            destinationStep.step.inputConnected = true;
        }
        else {
            step.returnPaths.push({ name: path.name });
        }
    }
}
