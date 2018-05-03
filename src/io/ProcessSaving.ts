import { DataField, Dictionary, Parameter, Step, StepType, StopStep, UserProcess } from '../data';

export class ProcessSaving {
    static saveProcesses(processes: Dictionary<UserProcess>) {
        let saveDoc = document.implementation.createDocument(null, 'processes', null);
        let rootNode = saveDoc.createElement('Processes');

        for (let i = 0; i < processes.count; i++) {
            this.saveProcess(processes.getByIndex(i), rootNode);
        }
        return rootNode.outerHTML;
    }

    private static saveProcess(process: UserProcess, parent: HTMLElement) {
        let element = parent.ownerDocument.createElement('Process');
        parent.appendChild(element);
        element.setAttribute('name', process.name);
        if (process.folder !== null) {
            element.setAttribute('folder', process.folder);
        }

        if (process.description !== null && process.description !== '') {
            let desc = parent.ownerDocument.createElement('Description');
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
        let steps = parent.ownerDocument.createElement('Steps');
        element.appendChild(steps);

        for (let step of process.steps) {
            this.saveStep(step, steps);
        }
    }

    private static saveStep(step: Step, parent: HTMLElement) {
        let element: HTMLElement;

        if (step.stepType === StepType.Start) {
            element = parent.ownerDocument.createElement('Start');
        }
        else if (step.stepType === StepType.Stop) {
            element = parent.ownerDocument.createElement('Stop');
            let returnPath = (step as StopStep).returnPath;
            if (returnPath !== null) {
                element.setAttribute('name', returnPath);
            }
        }
        else {
            element = parent.ownerDocument.createElement('Step');
            element.setAttribute('process', step.name);
        }
        parent.appendChild(element);
    
        element.setAttribute('ID', step.uniqueID.toString());

        element.setAttribute('x', step.x.toString());
        element.setAttribute('y', step.y.toString());

        this.saveStepParameters(step.inputs, element, 'MapInput', 'source');
        this.saveStepParameters(step.outputs, element, 'MapOutput', 'destination');

        for (let path of step.returnPaths) {
            let pathElement: HTMLElement;
            
            if (path.name !== null) {
                pathElement = parent.ownerDocument.createElement('NamedReturnPath');
                pathElement.setAttribute('name', path.name);
            }
            else {
                pathElement = parent.ownerDocument.createElement('ReturnPath');
            }

            pathElement.setAttribute('targetStepID', path.toStep.uniqueID.toString());
            element.appendChild(pathElement);
        }
    }

    private static saveStepParameters(
        parameters: Parameter[],
        parent: Element,
        nodeName: string,
        variableAttributeName: string
    ) {
        if (parameters === null) {
            return;
        }

        for (let parameter of parameters) {
            this.saveStepParameter(parameter, parent, nodeName, variableAttributeName);
        }
    }

    private static saveStepParameter(
        parameter: Parameter,
        parent: Element,
        nodeName: string,
        variableAttributeName: string
    ) {
        let element = parent.ownerDocument.createElement(parameter.initialValue === null ? nodeName : 'FixedInput');
        element.setAttribute('name', parameter.name);
        parent.appendChild(element);

        if (parameter.initialValue !== null) {
            element.setAttribute('value', parameter.initialValue);
        }
        else if (parameter.link != null) {
            element.setAttribute(variableAttributeName, parameter.link.name);
        }
    }

    private static saveProcessParameter(parameter: DataField, parent: Element, nodeName: string) {
        let element = parent.ownerDocument.createElement(nodeName);
        element.setAttribute('name', parameter.name);
        element.setAttribute('type', parameter.type.name);
        parent.appendChild(element);
        return element;
    }

    private static saveProcessReturnPath(returnPath: string, parent: Element) {
        let element = parent.ownerDocument.createElement('ReturnPath');
        element.setAttribute('name', returnPath);
        parent.appendChild(element);
    }
}