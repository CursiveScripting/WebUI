namespace Cursive {
    export class Workspace {
        readonly processList: ProcessList;
        readonly editor: ProcessEditor;
        private types: Type[];
        systemProcesses: {[key:string]:SystemProcess};
        userProcesses: {[key:string]:UserProcess};

        constructor(workspaceXml: HTMLElement, processList: HTMLElement, mainContainer: HTMLElement) {
            this.editor = new ProcessEditor(this, mainContainer);
	        this.loadWorkspace(workspaceXml);
	        this.processList = new ProcessList(this, processList);
        }
	    private loadWorkspace(workspaceXml: HTMLElement) {
		    this.types = [];
		    this.systemProcesses = {};
		    this.userProcesses = {};
		
		    let typesByName: {[key:string]:Type} = {};
		    let typeNodes = workspaceXml.getElementsByTagName('Type');
		    let typeColors = this.allocateColors(typeNodes.length);
		
		    for (let i=0; i<typeNodes.length; i++) {
			    let name = typeNodes[i].getAttribute('name');
			    let color = typeColors[i];
			
			    if (typesByName.hasOwnProperty(name)) {
				    this.showError('There are two types in the workspace with the same name: ' + name + '. Type names must be unique.');
				    continue;
			    }
			
			    let type = new Type(name, color);
			    this.types.push(type);
			    typesByName[name] = type;
		    }
		
		    let procNodes = workspaceXml.getElementsByTagName('SystemProcess');
		    for (let i=0; i<procNodes.length; i++) {
                let process = <SystemProcess>this.loadProcess(procNodes[i], typesByName, true);
                this.systemProcesses[process.name] = process;
            }

            procNodes = workspaceXml.getElementsByTagName('RequiredProcess');
		    for (let i=0; i<procNodes.length; i++) {
                let process = <UserProcess>this.loadProcess(procNodes[i], typesByName, false);
                this.userProcesses[process.name] = process;
            }
	    }
        private loadProcess(procNode, typesByName, isSystemProcess): Process {
			let name = procNode.getAttribute('name');
			
			let inputs: Variable[] = [];
			let outputs: Variable[] = [];
			let returnPaths: string[] = [];
            let procTypeName = isSystemProcess ? 'system' : 'fixed';
			
			let usedNames: {[key:string]:boolean} = {};
			let paramNodes = procNode.getElementsByTagName('Input');
			for (let j=0; j<paramNodes.length; j++) {
				let paramName = paramNodes[j].getAttribute('name');
				let paramTypeName = paramNodes[j].getAttribute('type');
				
				let paramType;
				if (typesByName.hasOwnProperty(paramTypeName))
					paramType = typesByName[paramTypeName];
				else {
					this.showError('The \'' + name + '\' ' + procTypeName + ' process has an input (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
					paramType = null;
				}	
				
				if (usedNames.hasOwnProperty(paramName))
					this.showError('The \'' + name + '\' ' + procTypeName + ' process has two inputs with the same name: ' + paramName + '. Input names must be unique within a process.');
				else {
					usedNames[paramName] = null;
					inputs.push(new Variable(paramName, paramType));
				}
			}
			
			usedNames = {};
			paramNodes = procNode.getElementsByTagName('Output');
			for (let j=0; j<paramNodes.length; j++) {
				let paramName = paramNodes[j].getAttribute('name');
				let paramTypeName = paramNodes[j].getAttribute('type');
				
				let paramType;
				if (typesByName.hasOwnProperty(paramTypeName))
					paramType = typesByName[paramTypeName];
				else {
					this.showError('The \'' + name + '\' ' + procTypeName + ' function has an output (' + paramName + ') with an unrecognised type: ' + paramTypeName + '.');
					paramType = null;
				}
				
				if (usedNames.hasOwnProperty(paramName))
					this.showError('The \'' + name + '\' ' + procTypeName + ' function has two outputs with the same name: ' + paramName + '. Output names must be unique within a process.');
				else {
					usedNames[paramName] = null;
					outputs.push(new Variable(paramName, paramType));
				}
			}
			
			let returnPathParents = procNode.getElementsByTagName('ReturnPaths');
			if (returnPathParents.length > 0) {
				let returnPathNodes = returnPathParents[0].getElementsByTagName('Path');
				
				usedNames = {};
				for (let j=0; j<returnPathNodes.length; j++) {
					let path = returnPathNodes[j].getAttribute('name');
					
					if (usedNames.hasOwnProperty(path))
						this.showError('The \'' + name + '\' ' + procTypeName + ' process has two return paths with the same name: ' + name + '. Return path names must be unique within a process.');
					else {
						usedNames[path] = null;
						returnPaths.push(path);	
					}
				}
			}
			    
            let process: Process;
            if (isSystemProcess)
                process = new SystemProcess(name, inputs, outputs, returnPaths);
            else {
                process = new UserProcess(name, inputs, outputs, returnPaths, true);
                (process as UserProcess).createDefaultSteps();
            }
            
            process.editor = this.editor;
            return process;
        }
	    private allocateColors(num) {
		    let hue2rgb = function hue2rgb(p, q, t){
			    if(t < 0) t += 1;
			    if(t > 1) t -= 1;
			    if(t < 1/6) return p + (q - p) * 6 * t;
			    if(t < 1/2) return q;
			    if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			    return p;
		    };
		    let hslToRgb = function (h, s, l) {
			    let r, g, b;

			    if(s == 0) {
				    r = g = b = l; // achromatic
			    }
                else{

				    let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
				    let p = 2 * l - q;
				    r = hue2rgb(p, q, h + 1/3);
				    g = hue2rgb(p, q, h);
				    b = hue2rgb(p, q, h - 1/3);
			    }

			    return 'rgb(' + Math.round(r * 255) + ', ' + Math.round(g * 255) + ', ' + Math.round(b * 255) + ')';
		    };
		
		    let colors = [];
		    let hueStep = 1 / num, hue = 0, sat = 1, lum = 0.45;
		    for (let i=0; i<num; i++) {
			    colors.push(hslToRgb(hue, sat, lum));
			    hue += hueStep;
		    }
		    return colors;
	    }
	    loadProcesses(processXml) {
		    // TODO: parse XML, add to existing processes
		    this.processList.populateList();
	    }
	    saveProcesses() {
		    // TODO: generate XML of all (user?) processes
		    return '<Processes />';
	    }
	    showError(message) {
		    this.editor.showText('<h3>An error has occurred</h3><p>Sorry. You might need to reload the page to continue.</p><p>The following error was encountered - you might want to report this:</p><pre>' + message + '</pre>');
		    console.error(message);
	    }
	    showPopup(contents, okAction) {
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