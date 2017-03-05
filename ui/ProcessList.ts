namespace Cursive {
    export class ProcessList {
        private readonly workspace: Workspace;
        private readonly listElement: HTMLElement;
        
        constructor(workspace: Workspace, processList: HTMLElement) {
            this.workspace = workspace;
            this.listElement = processList;
            this.populateList();
        }
        populateList() {
            let content = '<li class="addNew';
            if (this.workspace.editor.currentProcess === null)
                content += ' active';
            content += '">add new process</li>';

            let userProcs = this.workspace.userProcesses;
            for (let i = 0; i < userProcs.count; i++) {
                let proc = userProcs.getByIndex(i);
                content += this.writeListItem(proc, true, proc.isValid);
            }
            
            let sysProcs = this.workspace.systemProcesses;
            for (let i = 0; i < sysProcs.count; i++) {
                let proc = sysProcs.getByIndex(i);
                content += this.writeListItem(proc, false, true);
            }

            this.listElement.innerHTML = content;

            let dragStart = function (e) {
                e.dataTransfer.setData('process', e.target.getAttribute('data-process'));
            };

            let openUserProcess = function (e) {
                let name = e.currentTarget.getAttribute('data-process');
                let process = this.userProcesses.getByName(name);
                if (process === undefined) {
                    this.showError('Clicked unrecognised process: ' + name);
                    return;
                }
                
                this.editor.loadProcess(process);
                this.processList.populateList();
            }.bind(this.workspace);

            this.listElement.childNodes[0].addEventListener('dblclick', this.workspace.editor.showProcessOptions.bind(this.workspace.editor, null));

            let userProcessCutoff = this.workspace.userProcesses.count;

            for (let i=1; i<this.listElement.childNodes.length; i++) {
                let item = this.listElement.childNodes[i];
                item.addEventListener('dragstart', dragStart);
                
                if (i <= userProcessCutoff)
                    item.addEventListener('dblclick', openUserProcess);
            }
        }
        private writeListItem(process: Process, editable: boolean, valid: boolean) {
            let desc = '<li draggable="true" data-process="' + process.name + '" class="';
        
            if (!editable)
                desc += 'readonly ';
            if (!valid)
                desc += 'invalid ';
            else if (process == this.workspace.editor.currentProcess)
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
        private writeItemFields(variables: Variable[]) {
            var output = '';
            for (let i=0; i<variables.length; i++) {
                if (i > 0)
                    output += '<span class="separator">, </span>';
                output += '<span class="prop" style="color: ' + variables[i].type.color + '">' + variables[i].name + '</span>';
            }
            return output;
        }
    }
}