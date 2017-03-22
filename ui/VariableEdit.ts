namespace Cursive {
    export class VariableEdit {
        private readonly workspace: Workspace;
        private readonly popup: EditorPopup;
        private promptElement: HTMLDivElement;
        private nameInput: HTMLInputElement;
        private typeSelect: HTMLSelectElement;
        private deleteRow: HTMLDivElement;
        private editingVariable: Variable;
        private showParameterOnClose: ParameterDisplay;

        constructor(workspace: Workspace, popup: EditorPopup) {
            this.workspace = workspace;
            this.popup = popup;
            this.editingVariable = null;
        }
        populateContent() {
            this.popup.popupContent.innerHTML = '';

            this.promptElement = document.createElement('div');
            this.popup.popupContent.appendChild(this.promptElement);

            let fieldRow = this.popup.addField('name');
            this.nameInput = document.createElement('input');
            this.nameInput.type = 'text';
            fieldRow.appendChild(this.nameInput);

            fieldRow = this.popup.addField('type');
            this.typeSelect = document.createElement('select');
            fieldRow.appendChild(this.typeSelect);

            for (let i = 0; i < this.workspace.types.count; i++) {
                let dataType = this.workspace.types.getByIndex(i);
                let typeOption = document.createElement('option');
                typeOption.value = dataType.name;
                typeOption.text = dataType.name;
                typeOption.style.color = dataType.color;
                this.typeSelect.options.add(typeOption);
            }

            this.deleteRow = this.popup.addField(null);
            this.deleteRow.classList.add('delete');
            let deleteLink = document.createElement('span');
            deleteLink.className = 'link delete';
            deleteLink.innerText = 'remove this variable';
            this.deleteRow.appendChild(deleteLink);
            deleteLink.addEventListener('click', this.deleteClicked.bind(this));

            fieldRow = this.popup.addField(null);
            fieldRow.classList.add('buttons');

            let okButton = document.createElement('button');
            okButton.setAttribute('type', 'button');
            okButton.addEventListener('click', this.okClicked.bind(this));
            okButton.innerText = 'OK';
            fieldRow.appendChild(okButton);

            let cancelButton = document.createElement('button');
            okButton.setAttribute('type', 'button');
            cancelButton.addEventListener('click', this.hide.bind(this));
            cancelButton.innerText = 'cancel';
            fieldRow.appendChild(cancelButton);
        }
        
        showNew(showOnClose: ParameterDisplay = null) {
            this.showParameterOnClose = showOnClose;
            this.populateContent();
            this.popup.show();
            this.promptElement.innerText = 'Name your new variable, and select its type:';
            this.nameInput.value = '';
            this.typeSelect.selectedIndex = 0;
            this.typeSelect.disabled = false;
            this.deleteRow.style.display = 'none';
            this.editingVariable = null;
            this.nameInput.focus();
        }
        showExisting(variable: Variable) {
            this.showParameterOnClose = null;
            this.editingVariable = variable;
            this.populateContent();
            this.popup.show();
            this.promptElement.innerText = 'You can rename a variable, but you can\'t change its type:';
            this.nameInput.value = variable.name;
            this.typeSelect.value = variable.type.name;
            this.typeSelect.disabled = true;
            this.deleteRow.style.removeProperty('display');
            this.editingVariable = variable;
            this.nameInput.focus();
        }
        hide() {
            this.popup.hide();

            if (this.showParameterOnClose !== null) {
                this.workspace.parameterEditor.show(this.showParameterOnClose);
                this.showParameterOnClose = null;
            }
        }
        private okClicked() {
            EditorPopup.clearErrors(this.popup.popupContent);
            if (this.nameInput.value == '') {
                EditorPopup.showError(this.nameInput, 'Please enter a name for this variable.');
                return;
            }
            else if (this.typeSelect.value == '') {
                EditorPopup.showError(this.typeSelect, 'Please select a data type.');
                return;
            }

            if (this.editingVariable !== null)
                this.updateExistingVariable(this.editingVariable);
            else if (!this.createNewVariable())
                return;

            this.hide();
            this.workspace.variableListDisplay.populateList();
        }
        private createNewVariable() {
            let dataType = this.workspace.types.getByName(this.typeSelect.value);
            if (dataType === null) {
                EditorPopup.showError(this.typeSelect, 'Please select a data type.');
                return false;
            }

            let variableName = this.nameInput.value;
            for (let existing of this.workspace.currentProcess.variables)
                if (existing.name == variableName) {
                    EditorPopup.showError(this.nameInput, 'Another variable already uses this name. Please enter a different name.');
                    return;
                }
            
            let variable = new Variable(variableName, dataType);
            this.workspace.currentProcess.variables.push(variable);
            return true;
        }
        private updateExistingVariable(variable: DataField) {
            variable.name = this.nameInput.value;
        }
        private deleteClicked() {
            if (this.editingVariable === null)
                return;

            // TODO: confirm deletion
            
            let index = this.workspace.currentProcess.variables.indexOf(this.editingVariable);
            this.workspace.currentProcess.variables.splice(index, 1);

            // unlink from any linked parameters
            for (let param of this.editingVariable.links)
                param.link = null;

            this.workspace.currentProcess.validate();
            this.workspace.variableListDisplay.populateList();
            this.workspace.processListDisplay.populateList();
            this.workspace.processEditor.draw();
            this.hide();
        }
    }
}