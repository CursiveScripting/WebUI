namespace Cursive {
    export class ReturnPathEdit {
        private readonly workspace: Workspace;
        private readonly popup: EditorPopup;
        private nameInput: HTMLInputElement;
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
            prompt.innerText = 'Name a return path for this process, or leave blank to use none:';
            this.popup.popupContent.appendChild(prompt);

            this.nameInput = document.createElement('input');
            this.nameInput.type = 'text';
            this.nameInput.className = 'pathName';
            this.popup.popupContent.appendChild(this.nameInput);

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
            this.editingStep = stopStep;
            this.nameInput.value = stopStep.returnPath;
            this.popup.show();
        }
        hide() {
            this.popup.hide();
        }
        private okClicked() {
            this.editingStep.returnPath = this.nameInput.value;
            this.hide();
            this.workspace.variableListDisplay.populateList();
            this.workspace.processEditor.draw();
        }
    }
}