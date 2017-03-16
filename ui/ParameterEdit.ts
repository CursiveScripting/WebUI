namespace Cursive {
    export class ParameterEdit {
        private readonly workspace: Workspace;
        private readonly popup: EditorPopup;
        private prompt: HTMLDivElement;
        private fixedInputRow: HTMLElement;
        private fixedInputValue: HTMLInputElement;
        private variableSelect: HTMLSelectElement;
        private connector: ParameterDisplay;

        constructor(workspace: Workspace, popup: EditorPopup) {
            this.workspace = workspace;
            this.popup = popup;
        }
        populateContent() {
            this.popup.popupContent.innerHTML = '';
            this.prompt = document.createElement('div');
            this.prompt.className = 'parameter prompt';
            this.popup.popupContent.appendChild(this.prompt);

            this.fixedInputRow = this.popup.addField('fixed value');
            this.fixedInputValue = document.createElement('input');
            this.fixedInputValue.type = 'text';
            this.fixedInputValue.className = 'fixed value';
            this.fixedInputRow.appendChild(this.fixedInputValue);

            let variableContainer = this.popup.addField('variable');
            this.variableSelect = document.createElement('select');
            this.variableSelect.className = 'variable value';
            variableContainer.appendChild(this.variableSelect);

            let addVariable = document.createElement('span');
            addVariable.className = 'link addVariable';
            addVariable.innerText = 'add new';
            addVariable.addEventListener('click', this.addVariableClicked.bind(this));
            variableContainer.appendChild(document.createTextNode(' '));
            variableContainer.appendChild(addVariable);
            
            let fieldRow = this.popup.addField(null);
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

        show(connector: ParameterDisplay) {
            this.populateContent();
            this.connector = connector;

            if (connector.isInput && connector.param.type.allowInput) {
                this.fixedInputRow.style.removeProperty('display');
                this.prompt.innerText = 'Enter a fixed variable for this input, or select a variable to map from. ';
                if (connector.param.type.guidance != null)
                    this.prompt.innerText += connector.param.type.guidance;
                this.prompt.classList.add('input');
                this.prompt.classList.add('fixed');
                this.prompt.classList.remove('output');

                if (connector.param.initialValue !== null)
                    this.fixedInputValue.value = connector.param.initialValue;
                else
                    this.fixedInputValue.value = '';
            }
            else {
                this.fixedInputRow.style.display = 'none';
                this.prompt.classList.remove('fixed');
                if (this.connector.isInput) {
                    this.prompt.innerText = 'Select a variable to map this input from.';
                    this.prompt.classList.add('input');
                    this.prompt.classList.remove('output');
                }
                else {
                    this.prompt.innerText = 'Select a variable to map this output to.';
                    this.prompt.classList.add('output');
                    this.prompt.classList.remove('input');
                }
                this.fixedInputValue.value = '';
            }

            this.variableSelect.innerHTML = '';
            let varOption = document.createElement('option');
            varOption.value = '';
            varOption.text = '(please select)';
            this.variableSelect.options.add(varOption);

            let anyVariables = false;
            for (let variable of this.workspace.currentProcess.variables) {
                if (this.connector.isInput) {
                    // for inputs, the variable type must be assignable from the input type
                    if (!variable.type.isAssignableFrom(this.connector.param.type))
                        continue;
                }
                else {
                    // for outputs, the output type must be assignable from the variable type
                    if (!this.connector.param.type.isAssignableFrom(variable.type))
                        continue;
                }

                varOption = document.createElement('option');
                varOption.value = variable.name;
                varOption.text = variable.name;
                varOption.style.color = variable.type.color;
                varOption.selected = variable === connector.param.link;
                this.variableSelect.options.add(varOption);
                anyVariables = true;
            }
            
            if (anyVariables) {
                this.variableSelect.style.removeProperty('display');
            }
            else {
                this.variableSelect.style.display = 'none';
            }

            this.popup.show();
        }
        hide() {
            this.popup.hide();
        }
        okClicked() {
            EditorPopup.clearErrors(this.popup.popupContent);

            // if a variable is selected AND a fixed input value is entered, that's invalid. It needs to be either or.
            let fixedInput = this.fixedInputValue.value;
            let selectedVariableName = this.variableSelect.value;

            let hasFixed = fixedInput != '';
            let hasVar = selectedVariableName != '';

            if (hasFixed == hasVar) {
                if (hasFixed)
                    EditorPopup.showError(this.fixedInputValue, 'Please provide either a fixed input value or a variable, not both.');
                else if (this.connector.isInput && this.connector.param.type.allowInput)
                    EditorPopup.showError(this.fixedInputValue, 'Please provide either a fixed input value or select a variable.');
                else
                    EditorPopup.showError(this.variableSelect, 'Please select a variable.');

                return;
            }

            if (hasFixed && !this.connector.param.type.isValid(fixedInput)) {
                EditorPopup.showError(this.fixedInputValue, 'The value you entered is not valid.');
                return;
            }

            let previousVar = this.connector.param.link;
            if (previousVar !== null && previousVar.name != selectedVariableName) {
                let indexOnVar = previousVar.links.indexOf(this.connector.param);
                if (indexOnVar != -1)
                    previousVar.links.splice(indexOnVar, 1);
            }
            
            if (hasFixed) {
                this.connector.param.initialValue = fixedInput;
                this.connector.param.link = null;
            }
            else {
                let variable: Variable = null;
                for (let testVariable of this.workspace.currentProcess.variables)
                    if (testVariable.name == selectedVariableName) {
                        variable = testVariable;
                        break;
                    }

                if (variable === null) {
                    EditorPopup.showError(this.variableSelect, 'Unrecognised variable.');
                    return;
                }
                this.connector.param.initialValue = null;
                this.connector.param.link = variable;

                if (variable !== previousVar) {
                    variable.links.push(this.connector.param);
                }
            }

            this.hide();
            this.workspace.currentProcess.validate();
            this.workspace.processListDisplay.populateList();
            this.workspace.processEditor.draw();
        }
        addVariableClicked() {
            this.workspace.variableEditor.showNew(this.connector);
        }
    }
}