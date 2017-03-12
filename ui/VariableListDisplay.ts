namespace Cursive {
    export class VariableListDisplay {
        private readonly workspace: Workspace;
        private readonly rootElement: HTMLElement;
        
        constructor(workspace: Workspace, variableList: HTMLElement) {
            this.workspace = workspace;
            this.rootElement = variableList;
        }
        populateList() {
            this.rootElement.innerHTML = '';

            if (this.workspace.currentProcess == null) {
                this.rootElement.removeAttribute('data-process-name');
                return;
            }

            this.rootElement.setAttribute('data-process-name', this.workspace.currentProcess.name);

            if (!this.workspace.currentProcess.fixedSignature)
                this.rootElement.appendChild(this.createEditProcessLink());
            this.rootElement.appendChild(this.createAddVariableLink());

            for (let variable of this.workspace.currentProcess.variables) {
                this.rootElement.appendChild(this.createVariableLink(variable));
            }
        }
        private createEditProcessLink() {
            let link = document.createElement('li');
            link.className = 'link editProcess';
            link.innerText = 'edit process';

            link.addEventListener("click", this.editProcessLinkClicked.bind(this));
            return link;
        }
        private createAddVariableLink() {
            let link = document.createElement('li');
            link.className = 'link addVariable';
            link.innerText = 'add variable';

            link.addEventListener("click", this.addVariableLinkClicked.bind(this));
            return link;
        }
        private createVariableLink(variable: DataField) {
            let link = document.createElement('li');
            link.className = 'link variable';
            link.setAttribute('data-name', variable.name);
            link.setAttribute('data-type', variable.type.name);
            link.style.color = variable.type.color;
            link.innerText = variable.name;

            link.addEventListener("click", this.variableLinkClicked.bind(this, variable, link));
            link.addEventListener("mouseover", this.highlight.bind(this, variable, link));
            link.addEventListener("mouseout", this.highlight.bind(this, null, link));
            return link;
        }
        private editProcessLinkClicked() {
            if (this.workspace.currentProcess.fixedSignature)
                return;

            this.hide();
            this.workspace.processEditor.hide();
            this.workspace.processSignatureEditor.showExisting(this.workspace.currentProcess);
        }
        private addVariableLinkClicked() {
            this.workspace.variableEditor.showNew();
        }
        private variableLinkClicked(variable: Variable, link: HTMLElement) {
            this.workspace.variableEditor.showExisting(variable);
        }
        highlight(variable: Variable, hoverLink?: HTMLElement) {
            if (hoverLink === undefined) {
                let selector: string;
                if (variable === null)
                    selector = '.link.variable.highlight';
                else
                    selector = '.link.variable[data-name="' + variable.name + '"]';

                hoverLink = this.rootElement.querySelector(selector) as HTMLElement;
            }

            if (hoverLink != null) {
                if (variable === null)
                    hoverLink.classList.remove('highlight');
                else
                    hoverLink.classList.add('highlight');
            }

            this.workspace.processEditor.highlightConnectors(variable);
        }
        show() {
            this.rootElement.style.removeProperty('display');
        }
        hide() {
            this.rootElement.style.display = 'none';
        }
    }
}