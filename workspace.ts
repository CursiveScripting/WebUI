﻿namespace Cursive {
    export class Workspace {
        readonly processList: ProcessList;
        readonly editor: ProcessEditor;
        types: Dictionary<Type>;
        systemProcesses: Dictionary<SystemProcess>;
        userProcesses: Dictionary<UserProcess>;

        constructor(workspaceXml: HTMLElement, processList: HTMLElement, mainContainer: HTMLElement) {
            this.editor = new ProcessEditor(this, mainContainer);
            WorkspaceLoading.loadWorkspace(this, workspaceXml);
            this.processList = new ProcessList(this, processList);
        }
        setDefinitions(types: Dictionary<Type>, systemProcesses: Dictionary<SystemProcess>, userProcesses: Dictionary<UserProcess>) {
            this.types = types;
            this.systemProcesses = systemProcesses;
            this.userProcesses = userProcesses;
        }
        loadProcesses(processXml: HTMLElement) {
            ProcessLoading.loadProcesses(this, processXml);
            this.processList.populateList();
        }
        saveProcesses() {
            if (!this.validate()) {
                this.showError('<h3>Unable to save workspace</h3>Some of your processes are not valid. Please ensure all inputs, outputs and return paths are connected.');
                return null;    
            }
            return ProcessSaving.saveProcesses(this.userProcesses);
        }
        validate() {
            let valid = true;

            for (let name in this.userProcesses) {
                let process = this.userProcesses.getByName(name);
                if (!process.validate())
                    valid = false;
            }

            this.processList.populateList();
            return valid;
        }
        showError(message: string) {
            this.editor.showText('<h3>An error has occurred</h3><p>Sorry. You might need to reload the page to continue.</p><p>The following error was encountered - you might want to report this:</p><pre>' + message + '</pre>');
            console.error(message);
        }
        showPopup(contents: string, okAction: () => void = null) {
            this.editor.popupContent.innerHTML = contents;
        
            if (this.editor.popupEventListener != null)
                this.editor.popupOkButton.removeEventListener('click', this.editor.popupEventListener);
        
            if (okAction != null) {
                this.editor.popupOkButton.addEventListener('click', okAction);
                this.editor.popupEventListener = okAction;
            }
            else
                this.editor.popupEventListener = null;

            this.editor.popup.style.display = '';
            this.editor.overlay.style.display = '';

            let firstInput = this.editor.popup.querySelector('input') as HTMLElement;
            if (firstInput !== null)
                firstInput.focus();
        }
        getScrollbarSize() {
            let outer = document.createElement('div');
            outer.style.visibility = 'hidden';
            outer.style.width = '100px';
            outer.style.height = '100px';
            outer.style.msOverflowStyle = 'scrollbar'; // needed for WinJS apps

            document.body.appendChild(outer);

            let widthNoScroll = outer.offsetWidth;
            let heightNoScroll = outer.offsetHeight;

            // force scrollbars
            outer.style.overflow = 'scroll';

            // add innerdiv
            let inner = document.createElement('div');
            inner.style.width = '100%';
            inner.style.height = '100%';
            outer.appendChild(inner);

            let widthWithScroll = inner.offsetWidth;
            let heightWithScroll = inner.offsetHeight;

            // remove divs
            outer.parentNode.removeChild(outer);

            return {
                width: widthNoScroll - widthWithScroll,
                height: heightNoScroll - heightWithScroll
            }
        }
    }
}