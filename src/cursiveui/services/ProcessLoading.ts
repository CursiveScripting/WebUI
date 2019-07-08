﻿import { Type } from '../data';
import { IWorkspace } from '../workspaceState/IWorkspace';
import { createMap, isString } from './DataFunctions';
import { isUserProcess, usesReturnPaths } from './StepFunctions';
import { IUserProcess } from '../workspaceState/IUserProcess';
import { IVariable } from '../workspaceState/IVariable';
import { IStep, StepType } from '../workspaceState/IStep';
import { IProcess } from '../workspaceState/IProcess';
import { IParameter } from '../workspaceState/IParameter';
import { IStartStep } from '../workspaceState/IStartStep';
import { IStopStep } from '../workspaceState/IStopStep';
import { IProcessStep } from '../workspaceState/IProcessStep';

export class ProcessLoading {
    public static load(workspace: IWorkspace, processData: Document | string, showError: (msg: string) => void) {
        const rootElement = isString(processData)
            ? new DOMParser().parseFromString(processData, 'application/xml').documentElement
            : processData.firstChild as HTMLElement;

        return this.loadProcesses(workspace, rootElement, showError);
    }

    private static loadProcesses(workspace: IWorkspace, processXml: HTMLElement, showError: (msg: string) => void) {
        const processNodes = processXml.getElementsByTagName('Process');
        const typesByName = createMap(workspace.types, t => t.name);
        const processesByName = createMap(workspace.processes, p => p.name);
        
        for (const processNode of processNodes) {
            const process = this.loadProcessDefinition(typesByName, processNode, showError);
            
            const existing = processesByName.get(process.name);
            if (existing !== undefined) {
                if (isUserProcess(existing)) {
                    if (existing.fixedSignature) {
                        existing.variables = process.variables;
                        existing.folder = process.folder;
                        existing.description = process.description;
                    }
                    else {
                        showError(`There are two user processes with the same name: ${process.name}. Process names must be unique.`);
                    }
                }
                else {
                    showError(`A user process has the same name as a system processes: ${process.name}. Process names must be unique.`);
                }
                continue;
            }

            if (!processesByName.has(process.name)) {
                processesByName.set(process.name, process);
                workspace.processes.push(process);
            }
        }

        for (const processNode of processNodes) {
            this.loadProcessSteps(processNode, processesByName, showError);
        }
    }

    private static loadProcessDefinition(typesByName: Map<string, Type>, processNode: Element, showError: (msg: string) => void): IUserProcess {
        const name = processNode.getAttribute('name')!;
        const folder = processNode.hasAttribute('folder') ? processNode.getAttribute('folder') : null;
        const descNodes = processNode.getElementsByTagName('Description');
        const description = descNodes.length > 0 ? descNodes[0].innerHTML : '';

        const inputs: IParameter[] = [];
        let paramNodes = processNode.getElementsByTagName('Input');
        this.loadProcessParameters(typesByName, paramNodes, inputs, 'input', showError);

        const outputs: IParameter[] = [];
        paramNodes = processNode.getElementsByTagName('Output');
        this.loadProcessParameters(typesByName, paramNodes, outputs, 'output', showError);

        // TODO: why the heck are variables part of the process definition?
        const variables: IVariable[] = [];
        paramNodes = processNode.getElementsByTagName('Variable');
        this.loadProcessParameters(typesByName, paramNodes, variables, 'variable', showError);

        const returnPaths: string[] = [];
        const usedNames: {[key: string]: boolean} = {};
        paramNodes = processNode.getElementsByTagName('ReturnPath');
        for (const paramNode of paramNodes) {
            if (paramNode.parentElement !== processNode) {
                continue;
            }

            const returnPathName = paramNode.getAttribute('name')!;
            if (returnPathName !== '' && !usedNames.hasOwnProperty(returnPathName)) { // TODO: was null, not ''
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

    private static loadProcessParameters(
        typesByName: Map<string, Type>,
        paramNodes: HTMLCollectionOf<Element>,
        dataFields: IParameter[],
        paramTypeName: 'input' | 'output' | 'variable',
        showError: (msg: string) => void
    ) {
        const isVariable = paramTypeName === 'variable';

        for (const node of paramNodes) {
            const paramName = node.getAttribute('name')!;
            const typeName = node.getAttribute('type')!;
            const dataType = typesByName.get(typeName);

            if (dataType === undefined) {
                showError(`The ${paramName} ${paramTypeName} has an invalid type: ${typeName}. That type doesn't exist in this workspace.`);
                continue;
            }

            let dataField: IVariable | IParameter;
            if (isVariable) {
                dataField = {
                    name: paramName,
                    type: dataType,
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
                    type: dataType,   
                }
            }

            dataFields.push(dataField);
        }
    }

    private static loadProcessSteps(
        processNode: Element,
        processesByName: Map<string, IProcess>,
        showError: (msg: string) => void
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
                outputs: this.loadStepOutputs(id, process, process.inputs, stepNode, showError),
                returnPaths: this.loadReturnPaths(stepNode),
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
                    showError(`Step ${id} of the "${process.name}" process uses an unspecified return path name: ${name}.`
                     + ' That name isn\'t a return path on this process.');
                }
            }
            else {
                returnPath = null;
                if (process.returnPaths.length > 0) {
                    showError(`Step ${id} of the "${process.name}" process has no return path name.`
                     + ' This process uses named return paths, so a name is required.');
                }
            }

            const step: IStopStep = {
                uniqueId: id,
                stepType: StepType.Stop,
                inputs: this.loadStepInputs(id, process, process.outputs, stepNode, showError),
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
                showError(`Step ${id} of the "${process.name}" process wraps an unknown process: ${name}.`
                 + ' That process doesn\'t exist in this workspace.');
                continue;
            }

            const isUser = isUserProcess(childProcess);
            
            const step: IProcessStep = {
                uniqueId: id,
                stepType: isUser ? StepType.UserProcess : StepType.SystemProcess,
                processName: childProcess.name,
                inputs: this.loadStepInputs(id, process, childProcess.inputs, stepNode, showError),
                outputs: this.loadStepOutputs(id, process, childProcess.outputs, stepNode, showError),
                returnPaths: this.loadReturnPaths(stepNode),
                x: parseInt(stepNode.getAttribute('x')!),
                y: parseInt(stepNode.getAttribute('y')!),
            }

            stepsById.set(id, step);
        }
        
        this.verifyReturnPaths(process.name, stepsById, showError);
        
        process.steps = Array.from(stepsById.values());
    }

    private static loadStepInputs(stepId: string, process: IUserProcess, inputs: IParameter[], stepNode: Element, showError: (msg: string) => void) {
        return this.loadStepParameters(stepId, process, inputs, stepNode, 'input', 'Input', 'source', showError);
    }

    private static loadStepOutputs(stepId: string, process: IUserProcess, outputs: IParameter[], stepNode: Element, showError: (msg: string) => void) {
        return this.loadStepParameters(stepId, process, outputs, stepNode, 'output', 'Output', 'destination', showError);
    }

    private static loadStepParameters(
        stepId: string,
        process: IUserProcess,
        parameters: IParameter[],
        stepNode: Element,
        parameterTypeName: string,
        parameterElementTagName: string,
        linkAttributeName: string,
        showError: (msg: string) => void
    ) {
        const sourceNodes = stepNode.getElementsByTagName(parameterElementTagName);
        const results: Record<string, string> = {};
        
        for (const sourceNode of sourceNodes) {
            const paramName = sourceNode.getAttribute('name')!;
            const destinationName = sourceNode.getAttribute(linkAttributeName)!;

            const parameter = parameters.find(o => o.name === paramName);
            const destination = process.variables.find(v => v.name === destinationName);

            if (parameter === undefined) {
                showError(`Step ${stepId} of the "${process.name}" process tries to map a non-existant ${parameterTypeName}: ${paramName}`);
                continue;
            }
            if (destination === undefined) {
                showError(`Step ${stepId} of the "${process.name}" process tries to map an ${parameterTypeName} to a non-existant variable: ${destinationName}`);
                continue;
            }

            results[parameter.name] = destination.name;
        }

        return results;
    }

    private static loadReturnPaths(stepNode: Element) {
        let returnPathNodes = stepNode.getElementsByTagName('ReturnPath');
        const returnValue: Record<string, string> = {};

        for (const returnPathNode of returnPathNodes) {
            const targetStepID = returnPathNode.getAttribute('targetStepID')!;

            returnValue[''] = targetStepID;
            returnValue; // can only ever have one non-named return path
        }

        returnPathNodes = stepNode.getElementsByTagName('NamedReturnPath');

        for (const returnPathNode of returnPathNodes) {
            const name = returnPathNode.getAttribute('name')!;
            const targetStepID = returnPathNode.getAttribute('targetStepID')!;

            returnValue[name] = targetStepID;
        }

        return returnValue;
    }

    private static verifyReturnPaths(processName: string, stepsById: Map<string, IStep>, showError: (msg: string) => void) {
        for (const [, step] of stepsById) {
            if (usesReturnPaths(step)) {
                for (const path in step.returnPaths) {
                    const destination = step.returnPaths[path];

                    if (!stepsById.has(destination)) {
                        showError(`Step ${step.uniqueId} of the "${processName}" links a return path to an unknown step unknown process: ${name}.`
                        + ' That process doesn\'t exist in this workspace.');
                    }
                }
            }
        }
    }
}