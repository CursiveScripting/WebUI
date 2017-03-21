namespace Cursive {
    export class ProcessSignatureEdit {
        private readonly workspace: Workspace;
        private readonly rootElement: HTMLElement;
        private editingProcess: UserProcess;
        private processNameInput: HTMLInputElement;
        private inputListElement: HTMLOListElement;
        private outputListElement: HTMLOListElement;
        private returnPathListElement: HTMLOListElement;
        private folderNameInput: HTMLInputElement;
        private descriptionInput: HTMLTextAreaElement;
        private saveButton: HTMLButtonElement;
        private cancelButton: HTMLButtonElement;
        private deleteButton: HTMLButtonElement;
        
        constructor(workspace: Workspace, popupRoot: HTMLElement) {
            this.workspace = workspace;
            this.rootElement = popupRoot;
            this.editingProcess = null;
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
            this.processNameInput.id = 'txtProcessName';
            this.processNameInput.type = 'text';
            p.appendChild(this.processNameInput);

            p.appendChild(document.createTextNode(' '));

            this.deleteButton = document.createElement('button');
            p.appendChild(this.deleteButton);
            this.deleteButton.className = 'delete';
            this.deleteButton.innerText = 'delete this process';
            this.deleteButton.addEventListener('click', this.deleteButtonClicked.bind(this));

            this.inputListElement = this.createListElement('inputs', 'inputs', 'input');

            this.outputListElement = this.createListElement('outputs', 'outputs', 'output');

            this.returnPathListElement = this.createListElement('returnPaths', 'return paths', 'return path');


            p = document.createElement('p');
            this.rootElement.appendChild(p);
            label = document.createElement('label');
            label.setAttribute('for', 'txtFolderName');
            label.innerText = 'Folder group: ';
            p.appendChild(label);

            this.folderNameInput = document.createElement('input');
            this.folderNameInput.id = 'txtFolderName';
            this.folderNameInput.type = 'text';
            p.appendChild(this.folderNameInput);

            p.appendChild(document.createTextNode(' (optional, used for sorting the process list)'));


            p = document.createElement('p');
            this.rootElement.appendChild(p);
            label = document.createElement('label');
            label.setAttribute('for', 'txtProcessDescription');
            label.innerText = 'Description: ';
            
            this.descriptionInput = document.createElement('textarea');
            this.descriptionInput.id = 'txtProcessDescription';
            p.appendChild(this.descriptionInput);


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
        private createListElement(className: 'inputs' | 'outputs' | 'returnPaths', namePlural: string, nameSingular: string) {
            let fieldSet = document.createElement('fieldset');
            fieldSet.className = className;
            this.rootElement.appendChild(fieldSet);
            let legendElement = document.createElement('legend');
            legendElement.innerText = namePlural;
            fieldSet.appendChild(legendElement);

            let listElement = document.createElement('ol');
            fieldSet.appendChild(listElement);

            let addLink = document.createElement('div');
            addLink.className = "link add" + className;
            addLink.innerText = 'add new ' + nameSingular;
            fieldSet.appendChild(addLink);
            
            addLink.addEventListener('click',
                className == 'returnPaths' ? this.addReturnPathClicked.bind(this, listElement) : this.addParameterClicked.bind(this, listElement)
            );

            return listElement;
        }
        private addParameterClicked(listElement: HTMLOListElement) {
            listElement.appendChild(this.createProcessParameter(null));
        }
        private addReturnPathClicked(listElement: HTMLOListElement) {
            listElement.appendChild(this.createReturnPath(null));
        }
        private saveButtonClicked() {
            EditorPopup.clearErrors(this.rootElement);
            let processName = this.checkProcessName();
            if (processName === null)
                return;

            if (!this.checkParameterNames(this.inputListElement, 'input'))
                return;
            if (!this.checkParameterNames(this.outputListElement, 'output'))
                return;

            let isNew = false;
            if (this.editingProcess === null) {
                this.editingProcess = new UserProcess(processName, [], [], [], [], false, '', null);
                this.editingProcess.workspace = this.workspace;
                this.workspace.userProcesses.add(processName, this.editingProcess);
                isNew = true;
            }
            else if (this.editingProcess.name != processName) {
                this.workspace.userProcesses.remove(this.editingProcess.name)
                this.editingProcess.name = processName;
                this.workspace.userProcesses.add(processName, this.editingProcess);
            }

            this.editingProcess.description = this.descriptionInput.value.trim();
            let folder = this.folderNameInput.value.trim();
            this.editingProcess.folder = folder == '' ? null : folder;

            this.updateProcessParameters(this.editingProcess.inputs, this.inputListElement.childNodes);
            this.updateProcessParameters(this.editingProcess.outputs, this.outputListElement.childNodes);
            this.updateReturnPaths(this.editingProcess.returnPaths, this.returnPathListElement.childNodes);

            if (isNew) // input step needs the parameters to have been created
                this.editingProcess.createDefaultSteps();
            else
                this.workspace.processSignatureChanged(this.editingProcess);

            this.hide();
            this.workspace.processListDisplay.populateList();
            this.workspace.openProcess(this.editingProcess);
        }
        private checkProcessName() {
            let processName = this.processNameInput.value.trim();
            if (processName == '') {
                EditorPopup.showError(this.processNameInput, 'Please enter a name for this process.');
                return null;
            }
            let existingProcess: Process = this.workspace.userProcesses.getByName(processName);
            let existingProcessType: string;
            if (existingProcess !== null) {
                existingProcessType = 'user';
            }
            else {
                existingProcess = this.workspace.systemProcesses.getByName(processName);
                existingProcessType = 'system';
            }

            if (existingProcess !== undefined && existingProcess !== this.editingProcess) {
                EditorPopup.showError(this.processNameInput, 'There is already a ' + existingProcessType + ' process with this name. Please enter a different name.');
                return null;
            }
            return processName;
        }
        private checkParameterNames(listElement: HTMLOListElement, parameterType: 'input' | 'output'): boolean {
            let nameInputs = listElement.querySelectorAll('input.name');
            let ok = true;
            let usedNames: { [key: string]: boolean } = {};
            for (let i = 0; i < nameInputs.length; i++) {
                let nameInput = nameInputs[i] as HTMLInputElement;
                if (usedNames.hasOwnProperty(nameInput.value)) {
                    EditorPopup.showError(nameInput, 'Multiple ' + parameterType + 's have the same name. Please give this ' + parameterType + ' a different name.');
                    ok = false;
                }
                else
                    usedNames[nameInput.value] = true;
            }
            return ok;
        }
        private updateProcessParameters(parameters: DataField[], listItems: NodeList) {
            let oldParameters = parameters.slice();

            for (let i = 0; i < listItems.length; i++) {
                let item = listItems[i] as Element;

                let typeInput = item.querySelector('.type') as HTMLSelectElement;
                let dataType = this.workspace.types.getByName(typeInput.value);

                let nameInput = item.querySelector('.name') as HTMLInputElement;
                let name = nameInput.value.trim();

                let origName = nameInput.getAttribute('data-orig');
                if (origName === null || origName == '') {
                    parameters.push(new Parameter(name, dataType));
                    continue; // new parameter
                }

                let origParam = null; // existing parameter
                for (let j = 0; j < oldParameters.length; j++) {
                    let origParam = oldParameters[j];
                    if (origParam.name == origName) {
                        origParam.name = name;
                        origParam.type = dataType;
                        oldParameters.splice(j, 1);
                        break;
                    }
                }
            }

            // remove any parameters which weren't in the UI (cos they must have been removed)
            for (let oldParam of oldParameters) {
                let pos = parameters.indexOf(oldParam);
                if (pos != -1)
                    parameters.splice(pos, 1);
            }
        }
        private updateReturnPaths(returnPaths: string[], listItems: NodeList) {
            let oldReturnPaths = returnPaths.slice();

            for (let i = 0; i < listItems.length; i++) {
                let item = listItems[i] as Element;

                let nameInput = item.querySelector('.name') as HTMLInputElement;
                let name = nameInput.value.trim();

                if (!nameInput.hasAttribute('data-orig')) {
                    returnPaths.push(name);
                    continue; // new return path
                }

                let origName = nameInput.getAttribute('data-orig');
                let pos = oldReturnPaths.indexOf(origName);

                if (name != origName) {
                    returnPaths[pos] = name; // overwrite old path
                    continue;
                }
                
                oldReturnPaths.splice(pos, 1);
            }

            // remove any paths which weren't in the UI (cos they must have been removed)
            for (let oldPath of oldReturnPaths) {
                let pos = returnPaths.indexOf(oldPath);
                if (pos != -1)
                    returnPaths.splice(pos, 1);
            }
        }
        private cancelButtonClicked() {
            this.hide();
            this.workspace.processEditor.show();
            this.workspace.variableListDisplay.show();
        }
        private deleteButtonClicked() {
            // TODO: confirm deletion

            this.hide();
        
            this.workspace.processRemoved(this.editingProcess);
        }
        private show() {
            this.populateContent();
            this.inputListElement.innerHTML = '';
            this.outputListElement.innerHTML = '';
            this.returnPathListElement.innerHTML = '';

            this.rootElement.style.removeProperty('display');
        }
        hide() {
            this.rootElement.style.display = 'none';
        }
        showNew() {
            this.show();
            this.saveButton.innerText = 'add new process';
            this.cancelButton.style.display = 'none';
            this.deleteButton.style.display = 'none';
            this.editingProcess = null;
            this.folderNameInput.value = '';
            this.descriptionInput.value = '';
        }
        showExisting(process: UserProcess) {
            this.show();
            this.saveButton.innerText = 'update process';
            this.cancelButton.style.removeProperty('display');
            this.deleteButton.style.removeProperty('display');
            this.editingProcess = process;
            this.processNameInput.value = process.name;

            this.folderNameInput.value = process.folder === null ? '' : process.folder;
            this.descriptionInput.value = process.description;
            
            if (process.inputs !== null)
                for (let input of process.inputs)
                    this.inputListElement.appendChild(this.createProcessParameter(input));

            if (process.outputs !== null)
                for (let output of process.outputs)
                    this.outputListElement.appendChild(this.createProcessParameter(output));

            if (process.returnPaths !== null)
                for (let path of process.returnPaths)
                    this.returnPathListElement.appendChild(this.createReturnPath(path));
        }
        private createProcessParameter(param: DataField) {
            let element = document.createElement('li');

            let nameInput = document.createElement('input');
            nameInput.type = 'text';
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
                option.text = dataType.name;
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
        private createReturnPath(path: string) {
            let element = document.createElement('li');

            let nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'name';
            element.appendChild(nameInput);

            if (path !== null) {
                nameInput.value = path;
                nameInput.setAttribute('data-orig', path);
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
    }
}