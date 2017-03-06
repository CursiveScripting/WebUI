namespace Cursive {
    export class VariableListDisplay {
        private readonly workspace: Workspace;
        private readonly listElement: HTMLElement;
        
        constructor(workspace: Workspace, variableList: HTMLElement) {
            this.workspace = workspace;
            this.listElement = variableList;
            this.populateList();
        }
        populateList() {
            this.listElement.innerHTML = '';

            if (this.workspace.editor.currentProcess == null) {
                this.listElement.removeAttribute('data-process-name');
                return;
            }

            this.listElement.setAttribute('data-process-name', this.workspace.editor.currentProcess.name);

            this.listElement.appendChild(this.createAddVariableLink());

            for (let variable of this.workspace.editor.currentProcess.variables) {
                this.listElement.appendChild(this.createVariableLink(variable));
            }
        }
        private createAddVariableLink() {
            let link = document.createElement('li');
            link.className = 'link addVariable';
            link.innerText = 'add variable';

            link.addEventListener("click", this.addVariableLinkClicked.bind(this));
            return link;
        }
        private createVariableLink(variable: Variable) {
            let link = document.createElement('li');
            link.className = 'link variable';
            link.setAttribute('data-name', variable.name);
            link.setAttribute('data-type', variable.type.name);
            link.style.color = variable.type.color;
            link.innerText = variable.name;

            link.addEventListener("click", this.variableLinkClicked.bind(this, link, variable));
            link.addEventListener("mouseover", this.variableLinkMouseOver.bind(this, link, variable));
            link.addEventListener("mouseout", this.variableLinkMouseOut.bind(this, link, variable));
            return link;
        }
        private addVariableLinkClicked(link: HTMLElement, variable: Variable) {
            // TODO: open popup
        }
        private variableLinkClicked(link: HTMLElement, variable: Variable) {
            // TODO: open & populate popup
        }
        private variableLinkMouseOver(link: HTMLElement, variable: Variable) {
            // TODO: highlight link and variables
        }
        private variableLinkMouseOut(link: HTMLElement, variable: Variable) {
            // TODO: unhighlight link and variables
        }
    }
}