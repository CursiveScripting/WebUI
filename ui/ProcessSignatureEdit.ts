namespace Cursive {
    export class ProcessSignatureEdit {
        private readonly workspace: Workspace;
        private readonly rootElement: HTMLElement;
        private editingProcess: UserProcess;
        private processNameInput: HTMLInputElement;
        private inputListElement: HTMLOListElement;
        private outputListElement: HTMLOListElement;
        private saveButton: HTMLButtonElement;
        private cancelButton: HTMLButtonElement;
        
        constructor(workspace: Workspace, popupRoot: HTMLElement) {
            this.workspace = workspace;
            this.rootElement = popupRoot;
            this.editingProcess = null;
            this.populateContent();
        }
        private populateContent() {
            this.rootElement.innerHTML = '';

            let p = document.createElement('p');
            this.rootElement.appendChild(p);
            let label = document.createElement('label');
            label.setAttribute('for', 'txtProcessName');
            label.innerText = 'Process name: ';
            p.appendChild(label);

            this.processNameInput = document.createElement('input');
            this.processNameInput.setAttribute('id', 'txtProcessName');
            this.processNameInput.setAttribute('type', 'text');
            p.appendChild(this.processNameInput);

            this.inputListElement = this.createListElement('inputs', 'inputs', 'input');
            this.inputListElement.setAttribute('id', 'inputList');

            this.outputListElement = this.createListElement('outputs', 'outputs', 'output');
            this.outputListElement.setAttribute('id', 'outputList');

            p = document.createElement('p');
            p.className = 'returnPathNote';
            p.innerText = 'Note that return paths are configured within the process, and aren\'t set up through this screen.';
            this.rootElement.appendChild(p);

            p = document.createElement('p');
            p.className = 'row buttons';
            this.rootElement.appendChild(p);

            this.saveButton = document.createElement('button');
            p.appendChild(this.saveButton);
            this.saveButton.className = 'save';
            this.saveButton.addEventListener('click', this.saveButtonClicked.bind(this));

            this.cancelButton = document.createElement('button');
            p.appendChild(this.cancelButton);
            this.cancelButton.className = 'cancel';
            this.cancelButton.innerText = 'cancel';
            this.cancelButton.addEventListener('click', this.cancelButtonClicked.bind(this));
        }
        private createListElement(className: string, namePlural: string, nameSingular: string) {
            let fieldSet = document.createElement('fieldset');
            fieldSet.className = className;
            this.rootElement.appendChild(fieldSet);
            let legendElement = document.createElement('legend');
            legendElement.innerText = namePlural;
            fieldSet.appendChild(legendElement);

            let listElement = document.createElement('ol');
            fieldSet.appendChild(listElement);

            let addLink = document.createElement('div');
            addLink.className = "link add" + nameSingular;
            addLink.innerText = 'add new ' + nameSingular;
            fieldSet.appendChild(addLink);

            // TODO: hook up add link behaviour

            return listElement;
        }
        private saveButtonClicked() {
            // TODO: implement
        }
        private cancelButtonClicked() {
            // TODO: implement
        }
        private addInputClicked() {
            // TODO: implement
        }
        private addOutputClicked() {
            // TODO: implement
        }
        private show() {
            this.inputListElement.innerHTML = '';
            this.outputListElement.innerHTML = '';

            this.rootElement.style.removeProperty('display');
        }
        hide() {
            this.rootElement.style.display = 'none';
        }
        showNew() {
            this.show();
            this.saveButton.innerText = 'add new process';
            this.cancelButton.style.display = 'none';
            this.editingProcess = null;
        }
        showExisting(process: UserProcess) {
            this.show();
            this.saveButton.innerText = 'update process';
            this.cancelButton.style.removeProperty('display');
            this.editingProcess = process;
            
            if (process.inputs !== null)
                for (let i = 0; i < process.inputs.length; i++)
                    this.inputListElement.appendChild(this.writeProcessParameter(process.inputs[i]));

            if (process.outputs !== null)
                for (let i = 0; i < process.outputs.length; i++)
                    this.outputListElement.appendChild(this.writeProcessParameter(process.outputs[i]));
        }
        private writeProcessParameter(param: Variable) {
            let element = document.createElement('li');

            let nameInput = document.createElement('input');
            nameInput.setAttribute('type', 'text');
            nameInput.className = 'name';
            element.appendChild(nameInput);

            if (param !== null) {
                nameInput.value = param.name;
                nameInput.setAttribute('data-orig', param.name);
            }

            element.appendChild(document.createTextNode(' '));

            let typeSelect = document.createElement('select');
            typeSelect.className = 'type';
            element.appendChild(typeSelect);
            
            for (let i = 0; i < this.workspace.types.count; i++) {
                let dataType = this.workspace.types.getByIndex(i);
                let option = document.createElement('option');
                option.value = dataType.name;
                option.style.color = dataType.color;

                if (param !== null && param.type === dataType)
                    option.selected = true;

                typeSelect.appendChild(option);
            }

            element.appendChild(document.createTextNode(' '));

            let removeLink = document.createElement('span');
            removeLink.className = 'remove link';
            removeLink.innerText = 'remove';
            element.appendChild(removeLink);

            removeLink.addEventListener('click', this.removeParameterClicked.bind(this, element));
            return element;
        }
        private removeParameterClicked(paramElement: HTMLElement) {
            paramElement.parentElement.removeChild(paramElement);
        }


        /*
        private addInputClicked() {
            let item = document.createElement('li');
            item.innerHTML = this.writeProcessParameter(null);
            document.getElementById('inputList').appendChild(item);
            return false;
        }
        private addOutputClicked() {
            let item = document.createElement('li');
            item.innerHTML = this.writeProcessParameter(null);
            document.getElementById('outputList').appendChild(item);
            return false;
        }
        private saveProcessClicked() {
            let name = (<HTMLInputElement>document.getElementById('txtProcessName')).value.trim();

            let processes = this.workspace.systemProcesses;
            for (let i = 0; i < processes.count; i++)
                if (processes.getByIndex(i).name.trim() == name) {
                    this.workspace.showPopup('A system process already uses the name \'' + name + '\'. Please use a different one.');
                    return;
                }

            processes = this.workspace.userProcesses;
            for (let i = 0; i < processes.count; i++)
                if (processes.getByIndex(i) != this.currentProcess && processes.getByIndex(i).name.trim() == name) {
                    this.workspace.showPopup('Another process already uses the name \'' + name + '\'. Please use a different one.');
                    return;
                }

            let inputs = this.textDisplay.querySelectorAll('#inputList li');
            let outputs = this.textDisplay.querySelectorAll('#outputList li');

            let paramNames = {};
            for (let i = 0; i < inputs.length; i++) {
                let nameInput = inputs[i].querySelector('.name') as HTMLInputElement;
                let paramName = nameInput.value.trim();
                if (paramNames.hasOwnProperty(paramName)) {
                    this.workspace.showPopup('Multiple inputs have the same name: \'' + paramName + '\'. Please ensure input are unique.');
                    return;
                }
                else
                    paramNames[paramName] = true;
            }
            paramNames = {};
            for (let i = 0; i < outputs.length; i++) {
                let nameInput = outputs[i].querySelector('.name') as HTMLInputElement;
                let paramName = nameInput.value.trim();
                if (paramNames.hasOwnProperty(paramName)) {
                    this.workspace.showPopup('Multiple outputs have the same name: \'' + paramName + '\'. Please ensure output are unique.');
                    return;
                }
                else
                    paramNames[paramName] = true;
            }

            if (this.currentProcess !== null) {
                this.workspace.userProcesses.remove(this.currentProcess.name);
                this.currentProcess.name = name;
            }

            this.currentProcess = new UserProcess(name, [], [], [], [], false);
            this.currentProcess.createDefaultSteps();
            this.currentProcess.workspace = this.workspace;
            this.workspace.userProcesses.add(name, this.currentProcess);

            this.updateProcessParameters(this.currentProcess.inputs, inputs);
            this.updateProcessParameters(this.currentProcess.outputs, outputs);

            this.workspace.processListDisplay.populateList();
            this.showCanvas(true);
            this.draw();
        }
        private updateProcessParameters(parameters: Variable[], listItems: NodeListOf<Element>) {
            let oldParameters = parameters.slice();

            for (let i = 0; i < listItems.length; i++) {
                let item = listItems[i];

                let typeInput = item.querySelector('.type') as HTMLSelectElement;
                let typeIndex = parseInt(typeInput.value);
                if (isNaN(typeIndex) || typeIndex < 0 || typeIndex >= this.workspace.types.count) {
                    continue;
                }
                let type = this.workspace.types.getByIndex(typeIndex);

                let nameInput = item.querySelector('.name') as HTMLInputElement;
                let name = nameInput.value.trim();

                let origName = nameInput.getAttribute('data-orig');
                if (origName === null || origName == '') {
                    parameters.push(new Variable(name, type));
                    continue; // new parameter
                }

                let origParam = null; // existing parameter
                for (let j = 0; j < oldParameters.length; j++) {
                    let origParam = oldParameters[j];
                    if (origParam.name == origName) {
                        origParam.name = name;
                        origParam.type = type;
                        oldParameters.splice(j, 1);
                        break;
                    }
                }
            }

            // remove any parameters which weren't in the UI (cos they must have been removed)
            for (let i = 0; i < oldParameters.length; i++) {
                let oldParam = oldParameters[i];
                for (let j = 0; j < parameters.length; j++)
                    if (parameters[j] === oldParam)
                        parameters.splice(j, 1);
            }
        }
        */
    }
}