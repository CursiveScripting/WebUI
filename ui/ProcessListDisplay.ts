namespace Cursive {
    export class ProcessListDisplay {
        private readonly workspace: Workspace;
        private readonly listElement: HTMLElement;
        
        constructor(workspace: Workspace, processList: HTMLElement) {
            this.workspace = workspace;
            this.listElement = processList;
            this.populateList();
        }
        populateList() {
            let content = '<li class="addNew';
            if (this.workspace.currentProcess === null)
                content += ' active';
            content += '">add new process</li>';

            let userProcs = this.workspace.userProcesses;
            for (let i = 0; i < userProcs.count; i++) {
                let proc = userProcs.getByIndex(i);
                content += this.writeListItem(proc, true, proc.fixedSignature, proc.isValid);
            }
            
            let sysProcs = this.workspace.systemProcesses;
            for (let i = 0; i < sysProcs.count; i++) {
                let proc = sysProcs.getByIndex(i);
                content += this.writeListItem(proc, false, true, true);
            }

            this.listElement.innerHTML = content;

            let dragStart = function (e) {
                e.dataTransfer.setData('process', e.target.getAttribute('data-process'));
            };

            this.listElement.childNodes[0].addEventListener('click', this.addNewProcessClicked.bind(this));

            let userProcessCutoff = this.workspace.userProcesses.count;

            for (let i=1; i<this.listElement.childNodes.length; i++) {
                let item = this.listElement.childNodes[i];
                item.addEventListener('dragstart', dragStart);
                
                if (i <= userProcessCutoff)
                    item.addEventListener('click', this.openUserProcess.bind(this));
            }
        }
        private addNewProcessClicked() {
            this.workspace.processEditor.hide();
            this.workspace.variableListDisplay.hide();
            this.workspace.processSignatureEditor.showNew();
        }
        private writeListItem(process: Process, openable: boolean, fixedSignature: boolean, valid: boolean) {
            let desc = '<li draggable="true" data-process="' + process.name + '" class="';
        
            if (!openable)
                desc += 'cantOpen ';
            else if (fixedSignature)
                desc += 'fixed ';
            if (!valid)
                desc += 'invalid ';
            else if (process === this.workspace.currentProcess)
                desc += 'active';
        
            desc += '"><div class="name">' + process.name + '</div>';
        
            if (process.inputs.length > 0) {
                desc += '<div class="props inputs"><span class="separator">inputs: </span>'
                        + this.writeItemFields(process.inputs);
                        + '</div>';
            }
            if (process.outputs.length > 0) {
                desc += '<div class="props output"><span class="separator">outputs: </span>'
                        + this.writeItemFields(process.outputs)
                        + '</div>';
            }
            if (process.returnPaths.length > 0) {
                desc += '<div class="props paths"><span class="separator">return paths: </span>';
                for (let i=0; i<process.returnPaths.length; i++) {
                    if (i > 0)
                        desc += '<span class="separator">, </span>';
                    desc += '<span class="prop">' + process.returnPaths[i] + '</span>';
                }
                desc += '</div>';
            }
            desc += '</li>';
            return desc;
        }
        private writeItemFields(variables: DataField[]) {
            var output = '';
            for (let i=0; i<variables.length; i++) {
                if (i > 0)
                    output += '<span class="separator">, </span>';
                output += '<span class="prop" style="color: ' + variables[i].type.color + '">' + variables[i].name + '</span>';
            }
            return output;
        }
        private openUserProcess(e: MouseEvent) {
            let name = (e.currentTarget as HTMLElement).getAttribute('data-process');
            let process = this.workspace.userProcesses.getByName(name);
            if (process === undefined) {
                this.workspace.showError('Clicked unrecognised process: ' + name);
                return;
            }

            this.workspace.openProcess(process);
        }
    }
}