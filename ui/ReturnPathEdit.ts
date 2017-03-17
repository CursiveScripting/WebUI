namespace Cursive {
    export class ReturnPathEdit {
        private readonly workspace: Workspace;
        private readonly popup: EditorPopup;
        private pathSelect: HTMLSelectElement;
        private editingStep: StopStep;

        constructor(workspace: Workspace, popup: EditorPopup) {
            this.workspace = workspace;
            this.popup = popup;
            this.editingStep = null;
        }
        populateContent() {
            this.popup.popupContent.innerHTML = '';

            let prompt = document.createElement('div');
            prompt.className = 'returnPath prompt';
            prompt.innerText = 'Select a return path for this process:';
            this.popup.popupContent.appendChild(prompt);

            this.pathSelect = document.createElement('select');
            this.pathSelect.className = 'pathName';
            this.popup.popupContent.appendChild(this.pathSelect);

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
        show(stopStep: StopStep) {
            this.populateContent();
            this.editingStep = stopStep;
            this.pathSelect.innerHTML = '';
            
            for (let path of stopStep.parentProcess.returnPaths) {
                let pathOption = document.createElement('option');
                pathOption.value = path;
                pathOption.text = path;
                this.pathSelect.options.add(pathOption);
            }

            this.pathSelect.value = stopStep.returnPath;
            this.popup.show();
        }
        hide() {
            this.popup.hide();
        }
        private okClicked() {
            if (this.pathSelect.value == '') {
                EditorPopup.showError(this.pathSelect, 'Please select a return path');
                return;
            }

            this.editingStep.returnPath = this.pathSelect.value;
            this.hide();
            this.editingStep.parentProcess.validate();
            this.workspace.variableListDisplay.populateList();
            this.workspace.processEditor.draw();
        }
    }
}