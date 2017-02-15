namespace Cursive {
    export class ProcessSerialization {
        static loadProcesses(processes, processXml: HTMLElement) {
            // TODO: parse XML, add to existing processes
        }

        static saveProcesses(processes) {
            let rootNode = document.createElement('processes');

            for (let name in processes) {
                let process = processes[name];
                this.saveProcess(process, rootNode);
            }
            return rootNode.outerHTML;
        }

        private static saveProcess(process: UserProcess, parent: HTMLElement) {
            let element = parent.ownerDocument.createElement('process');
            parent.appendChild(element);
            element.setAttribute('name', process.name);

            // TODO: write inputs, outputs

            // TODO: write all variables
    
            for (let step of process.steps)
                this.saveStep(step, element);
        }

        private static saveStep(step: Step, parent: HTMLElement) {
            let element = parent.ownerDocument.createElement('Step');
            parent.appendChild(element);
        
            // TODO: write a step ID that's unique within this process

            element.setAttribute('x', step.x.toString());
            element.setAttribute('y', step.y.toString());

            // TODO: write step process name, or if it's a start/stop step
            // TODO: if its a stop step, write return path name

            for (let path of step.returnPaths) {
                let pathElement = parent.ownerDocument.createElement('returnPath');
                element.appendChild(pathElement);

                if (path.name !== null)
                    element.setAttribute('name', path.name);

                // TODO: write return path destination
            }

            // TODO: write additional step information (process name, i/o connections, return path connections)
        }
    }
}