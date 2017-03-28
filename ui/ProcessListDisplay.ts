namespace Cursive {
    export class ProcessListDisplay {
        private readonly workspace: Workspace;
        private readonly listElement: HTMLElement;
        private activeProcessItem: HTMLElement;
        private folderElements: {[key:string]:HTMLElement};
        
        constructor(workspace: Workspace, processList: HTMLElement) {
            this.workspace = workspace;
            this.listElement = processList;
            this.populateList();
        }
        populateList() {
            this.listElement.innerHTML = '';
            this.folderElements = {};
            this.activeProcessItem = null;
            this.createAddNewProcessItem();

            let userProcs = this.workspace.userProcesses;
            for (let i = 0; i < userProcs.count; i++) {
                let proc = userProcs.getByIndex(i);
                this.createProcessItem(proc, true, proc.fixedSignature, proc.isValid);
            }
            
            let sysProcs = this.workspace.systemProcesses;
            for (let i = 0; i < sysProcs.count; i++) {
                let proc = sysProcs.getByIndex(i);
                this.createProcessItem(proc, false, true, true);
            }            
        }
        private getFolderElement(proc: Process) {
            if (proc.folder === null)
                return this.listElement;

            let folderName = proc.folder;
            if (this.folderElements.hasOwnProperty(folderName)) {
                return this.folderElements[folderName];
            }
            else {
                let wrapperItem = document.createElement('li');
                wrapperItem.className = 'folder';
                wrapperItem.setAttribute('data-name', folderName);
                this.listElement.appendChild(wrapperItem);

                let folderList = document.createElement('ul');
                wrapperItem.appendChild(folderList);
                this.folderElements[folderName] = folderList;
                return folderList;
            }
        }
        private dragStart(e: DragEvent) {
            e.dataTransfer.setData('process', (e.target as Element).getAttribute('data-process'));
        }
        private createAddNewProcessItem() {
            let item = document.createElement('li');

            item.classList.add('addNew');
            if (this.workspace.currentProcess === null) {
                item.classList.add('active');
                this.activeProcessItem = item;
            }

            item.innerText = 'add new process';
            this.listElement.appendChild(item);
            
            item.addEventListener('click', this.addNewProcessClicked.bind(this, item));
        }
        private addNewProcessClicked(item: HTMLElement) {
            this.activeItemChanged(item);
            this.workspace.showAddNewProcess();
        }
        private createProcessItem(process: Process, openable: boolean, fixedSignature: boolean, valid: boolean) {
            let item = document.createElement('li');
            item.setAttribute('draggable', 'true');
            item.setAttribute('data-process', process.name);
            this.getFolderElement(process).appendChild(item);

            if (!openable)
                item.classList.add('cantOpen');
            else if (fixedSignature)
                item.classList.add('fixed');
            if (!valid)
                item.classList.add('invalid');
            if (process === this.workspace.currentProcess) {
                this.activeProcessItem = item;
                item.classList.add('active');
            }
        
            let element = document.createElement('div');
            element.className = 'name';
            element.innerText = process.name;
            item.appendChild(element);
        
            if (process.inputs.length > 0) {
                element = document.createElement('div');
                element.className = 'props inputs';
                item.appendChild(element);
                this.writeItemFields(process.inputs, element);
            }
            if (process.outputs.length > 0) {
                element = document.createElement('div');
                element.className = 'props outputs';
                item.appendChild(element);
                this.writeItemFields(process.outputs, element);
            }
            if (process.returnPaths.length > 0) {
                element = document.createElement('div');
                element.className = 'props returnPaths';
                item.appendChild(element);
 
                for (let returnPath of process.returnPaths) {
                    let prop = document.createElement('span');
                    prop.className = 'prop';
                    prop.innerText = returnPath;
                    element.appendChild(prop);
                }
            }

            element = document.createElement('div');
            element.className = 'description';
            element.innerText = process.description;
            item.appendChild(element);

            item.addEventListener('dragstart', this.dragStart.bind(this));
            
            if (openable)
                item.addEventListener('click', this.openUserProcess.bind(this, item));


            item.addEventListener('mouseover', this.itemHovered.bind(this, item));
            item.addEventListener('mouseleave', this.itemUnhovered.bind(this, item));
        }
        private writeItemFields(variables: DataField[], parent: HTMLElement) {
            for (let variable of variables) {
                let prop = document.createElement('span');
                prop.className = 'prop';
                prop.style.color = variable.type.color;
                prop.innerText = variable.name;
                parent.appendChild(prop);
            }
        }
        private openUserProcess(item: HTMLElement, e: MouseEvent) {
            this.activeItemChanged(item);
            let name = item.getAttribute('data-process');
            let process = this.workspace.userProcesses.getByName(name);
            if (process === undefined) {
                this.workspace.showError('Clicked unrecognised process: ' + name);
                return;
            }

            this.workspace.openProcess(process);
        }
        private activeItemChanged(item: HTMLElement) {
            if (this.activeProcessItem !== null)
                this.activeProcessItem.classList.remove('active');

            this.activeProcessItem = item;
            item.classList.add('active');
        }
        private itemHovered(item: HTMLElement) {
            item.classList.add('hover');
            window.setTimeout(this.toggleItem.bind(this, item), 500);
        }
        private toggleItem(item: HTMLElement) {
            item.classList.toggle('details', item.classList.contains('hover'));
        }
        private itemUnhovered(item: HTMLElement) {
            item.classList.remove('hover');
            window.setTimeout(this.toggleItem.bind(this, item), 500);
        }
    }
}