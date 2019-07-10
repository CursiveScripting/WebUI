import { IProcess } from '../workspaceState/IProcess';
import { isUserProcess, isStopStep, usesInputs, usesOutputs } from './StepFunctions';
import { IUserProcess } from '../workspaceState/IUserProcess';
import { IParameter } from '../workspaceState/IParameter';
import { StepType, IStep } from '../workspaceState/IStep';
import { IStopStep } from '../workspaceState/IStopStep';
import { IProcessStep } from '../workspaceState/IProcessStep';

export class ProcessSaving {
    static saveProcesses(processes: IProcess[]) {
        const saveDoc = document.implementation.createDocument(null, 'processes', null);
        const rootNode = saveDoc.createElement('Processes');

        for (const process of processes) {
            if (isUserProcess(process)) {
                this.saveProcess(process, rootNode);
            }
        }

        return rootNode.outerHTML;
    }

    private static saveProcess(process: IUserProcess, parent: HTMLElement) {
        let element = parent.ownerDocument!.createElement('Process');
        parent.appendChild(element);
        element.setAttribute('name', process.name);
        if (process.folder !== null) {
            element.setAttribute('folder', process.folder);
        }

        if (process.description !== null && process.description !== '') {
            let desc = parent.ownerDocument!.createElement('Description');
            desc.innerHTML = process.description;
            element.appendChild(desc);
        }

        // write inputs, outputs, variables
        for (let parameter of process.inputs) {
            this.saveProcessParameter(parameter, element, 'Input');
        }
        for (let parameter of process.outputs) {
            this.saveProcessParameter(parameter, element, 'Output');
        }
        for (let variable of process.variables) {
            let varElement = this.saveProcessParameter(variable, element, 'Variable');

            if (variable.initialValue !== null) {
                varElement.setAttribute('initialValue', variable.initialValue);
            }

            if (variable.x >= 0 && variable.y >= 0) {
                varElement.setAttribute('x', variable.x.toString());
                varElement.setAttribute('y', variable.y.toString());
            }
        }
        for (let returnPath of process.returnPaths) {
            this.saveProcessReturnPath(returnPath, element);
        }

        // write steps
        const steps = parent.ownerDocument!.createElement('Steps');
        element.appendChild(steps);

        for (const step of process.steps) {
            this.saveStep(step, steps);
        }
    }

    private static saveStep(step: IStep, parent: HTMLElement) {
        let element: HTMLElement;

        if (step.stepType === StepType.Start) {
            element = parent.ownerDocument!.createElement('Start');
        }
        else if (isStopStep(step)) {
            element = parent.ownerDocument!.createElement('Stop');
            let returnPath = (step as IStopStep).returnPath;
            if (returnPath !== null) {
                element.setAttribute('name', returnPath);
            }
        }
        else {
            element = parent.ownerDocument!.createElement('Step');
            element.setAttribute('process', (step as IProcessStep).processName);
        }
        parent.appendChild(element);
    
        element.setAttribute('ID', step.uniqueId.toString());

        element.setAttribute('x', step.x.toString());
        element.setAttribute('y', step.y.toString());

        if (usesInputs(step)) {
            this.saveStepParameters(step.inputs, element, 'Input', 'source');
        }

        if (usesOutputs(step)) {
            this.saveStepParameters(step.outputs, element, 'Output', 'destination');

            for (const pathName in step.returnPaths) {
                let pathElement: HTMLElement;
                
                if (pathName !== '') { // TODO: was null, not empty
                    pathElement = parent.ownerDocument!.createElement('NamedReturnPath');
                    pathElement.setAttribute('name', pathName);
                }
                else {
                    pathElement = parent.ownerDocument!.createElement('ReturnPath');
                }

                pathElement.setAttribute('targetStepID', step.returnPaths[pathName]);
                element.appendChild(pathElement);
            }
        }
    }

    private static saveStepParameters(
        parameters: Record<string, string>,
        parent: Element,
        nodeName: string,
        variableAttributeName: string
    ) {
        if (parameters === null) {
            return;
        }

        for (const parameterName in parameters) {
            const variableName = parameters[parameterName];
            this.saveStepParameter(parameterName, variableName, parent, nodeName, variableAttributeName);
        }
    }

    private static saveStepParameter(
        parameterName: string,
        variableName: string | undefined,
        parent: Element,
        nodeName: string,
        variableAttributeName: string
    ) {
        let element = parent.ownerDocument!.createElement(nodeName);
        element.setAttribute('name', parameterName);
        parent.appendChild(element);

        if (variableName !== undefined) {
            element.setAttribute(variableAttributeName, variableName);
        }
    }

    private static saveProcessParameter(parameter: IParameter, parent: Element, nodeName: string) {
        let element = parent.ownerDocument!.createElement(nodeName);
        element.setAttribute('name', parameter.name);
        element.setAttribute('type', parameter.typeName);
        parent.appendChild(element);
        return element;
    }

    private static saveProcessReturnPath(returnPath: string, parent: Element) {
        let element = parent.ownerDocument!.createElement('ReturnPath');
        element.setAttribute('name', returnPath);
        parent.appendChild(element);
    }
}