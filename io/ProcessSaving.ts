namespace Cursive {
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

            // write inputs, outputs, variables
            for (let parameter of process.inputs)
                this.saveProcessParameter(parameter, element, 'Input');
            for (let parameter of process.outputs)
                this.saveProcessParameter(parameter, element, 'Output');
            for (let variable of process.variables) {
                let varElement = this.saveProcessParameter(variable, element, 'Variable');
                // TODO: write initialValue attribute if required
            }

            // write steps
            let steps = parent.ownerDocument.createElement('Steps');
            element.appendChild(steps);
    
            for (let step of process.steps)
                this.saveStep(step, steps);
        }

        private static saveStep(step: Step, parent: HTMLElement) {
            let element: HTMLElement;

            if (step instanceof StartStep)
                element = parent.ownerDocument.createElement('Start');
            else if (step instanceof StopStep) {
                element = parent.ownerDocument.createElement('Stop');
                let returnPath = (step as StopStep).returnPath;
                if (returnPath !== null)
                    element.setAttribute('name', returnPath);
            }
            else {
                element = parent.ownerDocument.createElement('Step');
                element.setAttribute('process', step.process.name);
            }
            parent.appendChild(element);
        
            element.setAttribute('ID', step.uniqueID.toString());

            element.setAttribute('x', step.x.toString());
            element.setAttribute('y', step.y.toString());

            // TODO: write fixed input values
            this.saveStepParameters(step.getInputs(), element, 'MapInput', 'source');
            this.saveStepParameters(step.getOutputs(), element, 'MapOutput', 'destination');

            for (let path of step.returnPaths) {
                let pathElement: HTMLElement;
                
                if (path.name !== null) {
                    pathElement = parent.ownerDocument.createElement('NamedReturnPath');
                    pathElement.setAttribute('name', path.name);
                }
                else
                    pathElement = parent.ownerDocument.createElement('ReturnPath');

                pathElement.setAttribute('targetStepID', path.toStep.uniqueID.toString());
                element.appendChild(pathElement);
            }
        }

        private static saveStepParameters(parameters: Variable[], parent: Element, nodeName: string, variableAttributeName: string) {
            if (parameters === null)
                return;

            for (let parameter of parameters) {
                this.saveStepParameter(parameter, parent, nodeName, variableAttributeName);
            }
        }

        private static saveStepParameter(parameter: Variable, parent: Element, nodeName: string, variableAttributeName: string) {
            let element = parent.ownerDocument.createElement(parameter.initialValue === null ? nodeName : 'FixedInput');
            element.setAttribute('name', parameter.name);
            parent.appendChild(element);

            if (parameter.initialValue !== null)
                element.setAttribute('value', parameter.initialValue);
            else if (parameter.links.length >= 0)
                element.setAttribute(variableAttributeName, parameter.links[0].name);
        }

        private static saveProcessParameter(parameter: Variable, parent: Element, nodeName: string) {
            let element = parent.ownerDocument.createElement(nodeName);
            element.setAttribute('name', parameter.name);
            element.setAttribute('type', parameter.type.name);
            parent.appendChild(element);
            return element;
        }
    }
}