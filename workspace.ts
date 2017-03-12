namespace Cursive {
    export class Workspace {
        readonly processListDisplay: ProcessListDisplay;
        readonly variableListDisplay: VariableListDisplay;
        private readonly errorDisplay: ErrorDisplay;
        readonly variableEditor: VariableEdit;
        readonly parameterEditor: ParameterEdit;
        readonly returnPathEditor: ReturnPathEdit;
        readonly processSignatureEditor: ProcessSignatureEdit;
        readonly processEditor: EditorCanvas;
        types: Dictionary<Type>;
        systemProcesses: Dictionary<SystemProcess>;
        userProcesses: Dictionary<UserProcess>;
        currentProcess: UserProcess;

        constructor(workspaceXml: HTMLElement, processList: HTMLElement, variableList: HTMLElement, canvasWrapper: HTMLElement) {
            WorkspaceLoading.loadWorkspace(this, workspaceXml);
            canvasWrapper.classList.add('editorWrapper');

            let canvas = document.createElement('canvas');
            canvasWrapper.appendChild(canvas);

            let processEditRoot = document.createElement('div');
            processEditRoot.className = 'processSignatureEdit';
            canvasWrapper.appendChild(processEditRoot);

            let popupRoot = document.createElement('div');
            canvasWrapper.appendChild(popupRoot);

            let popup = new EditorPopup(popupRoot);

            this.errorDisplay = new ErrorDisplay(popup);
            this.processEditor = new EditorCanvas(this, canvas);
            this.processListDisplay = new ProcessListDisplay(this, processList);
            this.variableListDisplay = new VariableListDisplay(this, variableList);
            this.variableEditor = new VariableEdit(this, popup);
            this.parameterEditor = new ParameterEdit(this, popup);
            this.returnPathEditor = new ReturnPathEdit(this, popup);
            this.processSignatureEditor = new ProcessSignatureEdit(this, processEditRoot);
            this.currentProcess = null;
        }
        setDefinitions(types: Dictionary<Type>, systemProcesses: Dictionary<SystemProcess>, userProcesses: Dictionary<UserProcess>) {
            this.types = types;
            this.systemProcesses = systemProcesses;
            this.userProcesses = userProcesses;
        }
        loadProcesses(processXml: HTMLElement) {
            ProcessLoading.loadProcesses(this, processXml);
            this.processListDisplay.populateList();
        }
        saveProcesses() {
            if (!this.validate()) {
                this.showError('<h3>Unable to save workspace</h3>Some of your processes are not valid. Please ensure all inputs, outputs and return paths are connected.');
                return null;    
            }
            return ProcessSaving.saveProcesses(this.userProcesses);
        }
        openProcess(process: UserProcess) {
            this.currentProcess = process;
            this.processListDisplay.populateList();
            this.variableListDisplay.populateList();
            this.processEditor.loadProcess(process);
            this.variableListDisplay.show();
            this.processSignatureEditor.hide();
        }
        validate() {
            let valid = true;

            for (let name in this.userProcesses) {
                let process = this.userProcesses.getByName(name);
                if (!process.validate())
                    valid = false;
            }

            this.processListDisplay.populateList();
            return valid;
        }
        showError(message: string) {
            this.errorDisplay.showError(message);
            console.error(message);
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