namespace Cursive {
    export class VariableEdit {
        private readonly workspace: Workspace;
        private readonly popup: EditorPopup;
        private promptElement: HTMLDivElement;
        private nameInput: HTMLInputElement;
        private typeSelect: HTMLSelectElement;
        private editingVariable: Variable;

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

            fieldRow = this.popup.addField(null);
            fieldRow.classList.add('buttons');

            let okButton = document.createElement('button');
            okButton.addEventListener('click', this.okClicked.bind(this));
            okButton.innerText = 'OK';
            fieldRow.appendChild(okButton);

            let cancelButton = document.createElement('button');
            cancelButton.addEventListener('click', this.hide.bind(this));
            cancelButton.innerText = 'cancel';
            fieldRow.appendChild(cancelButton);
        }
        
        showNew() {
            this.populateContent();
            this.popup.show();
            this.promptElement.innerText = 'Name your new variable, and select its type:';
            this.nameInput.value = '';
            this.typeSelect.selectedIndex = 0;
            this.typeSelect.disabled = false;
            this.editingVariable = null;
            this.nameInput.focus();
        }
        showExisting(variable: Variable) {
            this.editingVariable = variable;
            this.populateContent();
            this.popup.show();
            this.promptElement.innerText = 'You can rename a variable, but you can\'t change its type:';
            this.nameInput.value = variable.name;
            this.typeSelect.value = variable.type.name;
            this.typeSelect.disabled = true;
            this.editingVariable = variable;
            this.nameInput.focus();
        }
        hide() {
            this.popup.hide();
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
        private updateExistingVariable(variable: Variable) {
            variable.name = this.nameInput.value;
        }
    }
}