namespace Cursive {
    export class ParameterEdit {
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
        /*
        populateContent() {
            this.popup.popupContent.innerHTML = '';

            this.promptElement = document.createElement('div');
            this.popup.popupContent.appendChild(this.promptElement);

            let fieldRow = this.addField('name');
            this.nameInput = document.createElement('input');
            this.nameInput.setAttribute('type', 'text');
            fieldRow.appendChild(fieldRow);

            fieldRow = this.addField('type');
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

            fieldRow = this.addField(null);

            let okButton = document.createElement('button');
            okButton.addEventListener('click', this.okClicked.bind(this));
            fieldRow.appendChild(okButton);

            let cancelButton = document.createElement('button');
            cancelButton.addEventListener('click', this.hide.bind(this));
            fieldRow.appendChild(cancelButton);
        }
        private addField(name: string) {
            let row = document.createElement('div');
            row.className = 'row';
            this.popup.popupContent.appendChild(row);

            if (name !== null) {
                let label = document.createElement('span');
                label.className = 'label';
                label.innerText = name;
                row.appendChild(label);
            }

            let wrapper = document.createElement('span');
            wrapper.className = 'value';
            row.appendChild(wrapper);

            return row;
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
            this.populateContent();
            this.popup.show();
            this.promptElement.innerText = 'You can rename a variable, but you can\'t change its type:';
            this.nameInput.value = variable.name;
            this.typeSelect.selectedIndex = this.typeSelect.options.namedItem(variable.type.name).index;
            this.typeSelect.disabled = true;
            this.editingVariable = variable;
            this.nameInput.focus();
        }
        hide() {
            this.popup.hide();
        }
        private okClicked() {
            if (this.nameInput.value == '' || this.typeSelect.selectedIndex == 0)
                return; // required field is blank, so cancel. TODO: highlight error.

            if (this.editingVariable !== null)
                this.updateExistingVariable(this.editingVariable);
            else if (!this.createNewVariable())
                return;

            this.hide();
            this.workspace.variableListDisplay.populateList();
        }
        private createNewVariable() {
            let dataType = this.workspace.types.getByName(this.typeSelect.value);
            if (dataType == null)
                return false;

            let variableName = this.nameInput.value;

            for (let existing of this.workspace.processEditor.currentProcess.variables)
                if (existing.name == variableName) {
                    // TODO: highlight name in use error
                    return;
                }
            
            let variable = new Variable(variableName, dataType);
            this.workspace.processEditor.currentProcess.variables.push(variable);
            return true;
        }
        private updateExistingVariable(variable: Variable) {
            variable.name = this.nameInput.value;
        }
        */
    }
}