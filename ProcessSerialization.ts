namespace Cursive {
    export class ProcessSerialization {
        static loadProcesses(processes, processXml: HTMLElement) {
            // TODO: parse XML, add to existing processes
        }

        static saveProcesses(processes) {
            let rootNode = document.createElement('Processes');

            for (let name in processes) {
                let process = processes[name];
                this.saveProcess(process, rootNode);
            }
            return rootNode.outerHTML;
        }

        private static saveProcess(process: UserProcess, parent: HTMLElement) {
            let element = parent.ownerDocument.createElement('Process');
            parent.appendChild(element);
            element.setAttribute('name', process.name);

            // TODO: write inputs, outputs

            // TODO: write all variables
    
            for (let step of process.steps)
                this.saveStep(step, element);
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
            this.saveParameters(step.getInputs(), element, 'MapInput', 'source');
            this.saveParameters(step.getOutputs(), element, 'MapOutput', 'destination');

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

        private static saveParameters(parameters: Variable[], parent, nodeName, variableAttributeName) {
            if (parameters === null)
                return;

            for (let parameter of parameters) {
                this.saveParameter(parameter, parent, nodeName, variableAttributeName);
            }
        }

        private static saveParameter(parameter: Variable, parent, nodeName, variableAttributeName) {
            let element = parent.ownerDocument.createElement(nodeName);
            element.setAttribute('name', parameter.name);
            element.setAttribute(variableAttributeName, 'dunno'); // TODO: get actual variable name
        }
    }
}