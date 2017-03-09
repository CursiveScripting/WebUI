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
    }
}