namespace Cursive {
    export class ProcessEditor {
        private readonly workspace: Workspace;
        private readonly root: HTMLElement;
        currentProcess: UserProcess;
        private textDisplay: HTMLElement;
        popup: HTMLElement;
        overlay: HTMLElement;
        popupContent: HTMLElement;
        popupOkButton: HTMLElement;
        popupEventListener: EventListener;
        private highlightType: Type;
        private hoverVariable: Variable;
        hoverRegion: Region;
        mouseDownRegion: Region;
        fixedRegions: Region[];
        variableRegions: Region[];
        private canvas: HTMLCanvasElement;
        private canvasWidth: number;
        private headerCutoff: number;
        private titleEndX: number;

        constructor(workspace: Workspace, root: HTMLElement) {
            this.workspace = workspace;
            this.root = root;
            this.highlightType = null;
            this.hoverVariable = null;
            this.setupUI();
        }
        loadProcess(process) {
            this.hoverRegion = null;
            this.currentProcess = process;
            this.showCanvas(true);
            this.variablesUpdated();
            this.draw();
        }
        updateSize() {
            let scrollSize = this.workspace.getScrollbarSize();
        
            let w = this.canvasWidth = this.root.offsetWidth - scrollSize.width, h = this.root.offsetHeight - scrollSize.height;
            this.canvas.setAttribute('width', w.toString());
            this.canvas.setAttribute('height', h.toString());
            this.textDisplay.setAttribute('width', w.toString());
            this.textDisplay.setAttribute('height', h.toString());
        
            this.draw();
        }
        private setupUI() {
            this.root.innerHTML = '<canvas></canvas><div class="textDisplay"></div><div class="popup" style="display:none"><div class="content"></div><div class="buttons"><button>OK</button></div></div><div class="overlay" style="display:none"></div>';
            this.canvas = <HTMLCanvasElement>this.root.childNodes[0];
            this.textDisplay = <HTMLElement>this.root.childNodes[1];
            this.popup = <HTMLElement>this.root.childNodes[2];
            this.popupContent = <HTMLElement>this.popup.childNodes[0];
            this.popupOkButton = <HTMLElement>this.popup.querySelector('.buttons > button');
            this.overlay = <HTMLElement>this.root.childNodes[3];

            this.popupOkButton.addEventListener('click', this.popupOkButtonClicked.bind(this));
        
            this.showCanvas(true);
        
            this.headerCutoff = 68;
            this.canvasWidth = 999;
        
            let title = new Region(
                null,
                this.drawTitleRegion.bind(this)
            );
            let editLink = new Region(
                this.defineEditLinkRegion.bind(this),
                this.drawEditLinkRegion.bind(this),
                'pointer'
            );
            editLink.click = this.editLinkRegionClicked.bind(this);
            editLink.hover = function() { return true; }
            editLink.unhover = function() { return true; }
        
            let addVariable = new Region(
                this.defineAddVariableRegion.bind(this),
                this.drawAddVariableRegion.bind(this),
                'pointer'
            );
            addVariable.click = this.addVariableRegionClicked.bind(this),
            addVariable.hover = function() { return true; }
            addVariable.unhover = function() { return true; }
            
            let stopStep = new Region(
                this.defineStopStepRegion.bind(this),
                this.drawStopStepRegion.bind(this),
                'move'
            );
            stopStep.mousedown = this.stopStepRegionMouseDown.bind(this);

            this.fixedRegions = [addVariable, title, editLink, stopStep];
            this.variableRegions = [];
            this.hoverRegion = null;
            this.mouseDownRegion = null;

            this.canvas.addEventListener('dragover', this.canvasDragOver.bind(this));
            this.canvas.addEventListener('drop', this.canvasDrop.bind(this));
            this.canvas.addEventListener('mousedown', this.canvasMouseDown.bind(this));
            this.canvas.addEventListener('mouseup', this.canvasMouseUp.bind(this));
            this.canvas.addEventListener('mouseout', this.canvasMouseOut.bind(this));
            this.canvas.addEventListener('mousemove', this.canvasMouseMove.bind(this));
        
            window.addEventListener('resize', this.updateSize.bind(this));
            setTimeout(this.updateSize.bind(this), 0);
        }
        private popupOkButtonClicked() {
            this.popup.style.display = 'none';
            this.overlay.style.display = 'none';
        }
        private drawTitleRegion(ctx: CanvasRenderingContext2D) {
            ctx.font = '36px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#000';
            ctx.fillText(this.currentProcess.name, 32, 8);

            this.titleEndX = 32 + ctx.measureText(this.currentProcess.name).width;

            ctx.lineWidth = 0.5;
            ctx.strokeStyle = '#000';
            ctx.beginPath();
            ctx.moveTo(0, this.headerCutoff);
            ctx.lineTo(this.canvasWidth, this.headerCutoff);
            ctx.stroke();
        }
        private defineEditLinkRegion(ctx: CanvasRenderingContext2D) {
            ctx.rect(32, 44, 100, 18);
        }
        private drawEditLinkRegion(ctx: CanvasRenderingContext2D, isMouseOver: boolean, isMouseDown: boolean) {
            if (this.currentProcess.fixedSignature)
                return;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.font = '16px sans-serif';
            ctx.strokeStyle = ctx.fillStyle = isMouseDown ? '#000' : '#999';

            Drawing.underlineText(ctx, 'edit this process', 32, 62, isMouseOver);
        }
        private editLinkRegionClicked() {
            if (this.currentProcess.fixedSignature)
                return;
            this.showProcessOptions(this.currentProcess);
        }
        private defineAddVariableRegion(ctx: CanvasRenderingContext2D) {
            ctx.rect(this.titleEndX + 16, 22, 100, 16);
        }
        private drawAddVariableRegion(ctx: CanvasRenderingContext2D, isMouseOver: boolean, isMouseDown: boolean) {
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.font = '16px sans-serif';
            ctx.strokeStyle = ctx.fillStyle = isMouseDown ? '#000' : '#999';

            Drawing.underlineText(ctx, 'add variable', this.titleEndX + 16, 40, isMouseOver);
        }
        private addVariableRegionClicked() {
            let content = 'Name your new variable, and select its type:<br/><input type="text" class="name" value="'
            // content += name
            content += '" /> <select class="type">';

            for (let i = 0; i < this.workspace.types.count; i++) {
                let type = this.workspace.types.getByIndex(i);
                content += '<option value="' + i + '" style="color:' + type.color + ';"';
                //content +=' selected="selected"';
                content += '>' + type.name + '</option>';
            }
            content += '</select>';

            // TODO: allow editing existing variables

            // TODO: link to delete existing variables

            let action = this.addVariableRegionConfirmed.bind(this);

            this.workspace.showPopup(content, action);
        }
        private addVariableRegionConfirmed() {
            let nameInput = this.popupContent.querySelector('.name') as HTMLInputElement;
            let name = nameInput.value;
            let warnDuplicate = false;

            for (let i = 0; i < this.currentProcess.variables.length; i++) {
                let existing = this.currentProcess.variables[i];
                if (existing.name == name) {
                    warnDuplicate = true;
                    break;
                }
            }

            if (warnDuplicate)
                return false; // TODO: have a way of stopping the popup from closing

            let typeInput = this.popupContent.querySelector('.type') as HTMLSelectElement;
            let type = this.workspace.types.getByIndex(parseInt(typeInput.value));

            this.currentProcess.variables.push(new Variable(name, type));
            this.variablesUpdated();
            this.draw();
        }
        private defineStopStepRegion(ctx: CanvasRenderingContext2D) {
            ctx.rect(this.canvasWidth - 50, 10, 40, 40);
        }
        private drawStopStepRegion(ctx: CanvasRenderingContext2D, isMouseOver: boolean, isMouseDown: boolean) {
            ctx.strokeStyle = '#000';
            ctx.fillStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.rect(this.canvasWidth - 50, 10, 40, 40);
            ctx.fill();
            ctx.stroke();

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = '32px sans-serif';
            ctx.strokeStyle = ctx.fillStyle = isMouseDown ? '#000' : '#a00';
            ctx.fillText('+', this.canvasWidth - 30, 30);
        }
        private stopStepRegionMouseDown(x: number, y: number) {
            let step = new StopStep(this.currentProcess.getNextStepID(), this.currentProcess, null, this.canvasWidth - 30, 30);
            this.currentProcess.steps.push(step);
            step.dragging = true;
            step.bodyRegion.mousedown(x, y - 35);
            return false;
        }
        private canvasDragOver(e: Event) {
            if (this.currentProcess == null)
                return;
            e.preventDefault();
        }
        private canvasDrop(e: DragEvent) {
            if (this.currentProcess == null)
                return;
            e.preventDefault();
            let process = e.dataTransfer.getData('process');
            let pos = this.getCanvasCoords(e);

            this.dropProcess(process, pos.x, pos.y);
        }
        private canvasMouseDown(e: MouseEvent) {
            let pos = this.getCanvasCoords(e);
            let region = this.getRegion(pos.x, pos.y);
            this.mouseDownRegion = region;
            if (region != null && region.mousedown(pos.x, pos.y))
                this.draw();
        }
        private canvasMouseUp(e: MouseEvent) {
            let pos = this.getCanvasCoords(e);
            let region = this.getRegion(pos.x, pos.y);
            let draw = false;

            if (region != null) {
                draw = region.mouseup(pos.x, pos.y);

                if (region === this.mouseDownRegion)
                    draw = region.click() || draw;
            }
            if (this.mouseDownRegion != null) {
                if (region !== this.mouseDownRegion)
                    draw = this.mouseDownRegion.mouseup(pos.x, pos.y) || draw;
                this.mouseDownRegion = null;
                draw = true;
            }

            if (draw)
                this.draw();
        }
        private canvasMouseOut(e: MouseEvent) {
            if (this.hoverRegion != null) {
                let pos = this.getCanvasCoords(e);
                let ctx = this.canvas.getContext('2d');

                if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
                    let draw = this.hoverRegion.unhover();
                    this.hoverRegion = null;
                    this.canvas.style.cursor = '';

                    if (draw)
                        this.draw();
                }
            }
        }
        private canvasMouseMove(e: MouseEvent) {
            if (this.currentProcess == null)
                return;

            let pos = this.getCanvasCoords(e);

            let ctx = this.canvas.getContext('2d');
            ctx.strokeStyle = 'rgba(0,0,0,0)';

            // check for "unhovering"
            if (this.hoverRegion != null) {
                if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
                    let draw = this.hoverRegion.unhover();
                    this.hoverRegion = null;
                    this.canvas.style.cursor = '';

                    if (draw)
                        this.draw();
                }
            }

            let draw = false;
            let region = this.getRegion(pos.x, pos.y);
            if (region != null) {
                if (region != this.hoverRegion) {
                    draw = region.hover();
                    this.hoverRegion = region;
                    this.canvas.style.cursor = region.cursor;
                }
                else
                    draw = region.move(pos.x, pos.y);
            }

            if (this.mouseDownRegion != null && this.mouseDownRegion != region)
                draw = this.mouseDownRegion.move(pos.x, pos.y) || draw;

            if (draw)
                this.draw();
        }
        getContext() {
            return this.canvas.getContext('2d');
        }
        getCanvasCoords(e: MouseEvent) {
            let canvasPos = this.canvas.getBoundingClientRect();
            return { x: e.clientX - canvasPos.left, y: e.clientY - canvasPos.top };
        }
        getRegion(x: number, y: number) {
            if (this.currentProcess == null)
                return null;
            let ctx = this.canvas.getContext('2d');
            ctx.strokeStyle = 'rgba(0,0,0,0)';
        
            // check regions from steps
            let steps = this.currentProcess.steps;
            for (let i=0; i<steps.length; i++) {
                let step = steps[i];
                let regions = step.regions;
                for (let j=0; j<regions.length; j++) {
                    let region = regions[j];
                    if (region.containsPoint(ctx, x, y))
                        return region;
                }
                let paths = step.returnPaths;
                for (let j=0; j<paths.length; j++) {
                    let path = paths[j];
                    for (let k=0; k<path.regions.length; k++) {
                        let region = path.regions[k];
                        if (region.containsPoint(ctx, x, y))
                            return region;
                    }
                }
            }
        
            // check fixed regions
            for (let i=0; i<this.fixedRegions.length; i++) {
                let region = this.fixedRegions[i];
                if (region.containsPoint(ctx, x, y))
                    return region;
            }
        
            // check variable regions
            for (let i=0; i<this.variableRegions.length; i++) {
                let region = this.variableRegions[i];
                if (region.containsPoint(ctx, x, y))
                    return region;
            }
            return null;
        }
        getStep(x: number, y: number) {
            let ctx = this.canvas.getContext('2d');
            let steps = this.currentProcess.steps;
            for (let i=0; i<steps.length; i++) {
                let regions = steps[i].regions;
                for (let j=0; j<regions.length; j++) {
                    let region = regions[j];
                    if (region.containsPoint(ctx, x, y))
                        return steps[i];
                }
            }
            return null;
        }
        showCanvas(show: boolean) {
            if (show) {
                this.canvas.style.removeProperty('display');
                this.textDisplay.style.setProperty('display', 'none');
            }
            else {
                this.canvas.style.setProperty('display', 'none');
                this.textDisplay.style.removeProperty('display');
            }
        }
        showText(text: string) {
            this.textDisplay.innerHTML = text;
            this.showCanvas(false);
        }
        showFixedInput(connector: Connector, input: Variable) {
            // TODO: properly implement this
            let content = 'Specify a fixed value for this input. '
            if (input.type.guidance != null)
                content += input.type.guidance;
            content += ' <br/><input type="text" class="value" value="';

            if (input.initialValue !== null)
                content += input.initialValue;
            content += ' " />';
            
            this.workspace.showPopup(content, this.fixedInputPopupConfirmed.bind(this, connector, input));
        }
        private fixedInputPopupConfirmed(connector: Variable, input: Variable) {
            let valueInput = this.popupContent.querySelector('.value') as HTMLInputElement;
            let value = valueInput.value;
            if (!input.type.isValid(value))
                return false; // TODO: stop the popup from closing

            if (input.links.length > 0) {
                let linkedVar = input.links[0];
                let indexOnVar = linkedVar.links.indexOf(connector);
                if (indexOnVar != -1)
                    linkedVar.links.splice(indexOnVar, 1);
                input.links = [];
            }
            input.initialValue = value;
        }
        showProcessOptions(process) {
            this.currentProcess = process;
        
            let output = '<p><label for="txtProcessName">Process name</label>: <input id="txtProcessName" type="text"';
            if (process !== null)
                output += ' value="' + process.name + '"';
        
            output += ' /></p>'
            output += '<fieldset class="inputs"><legend>inputs</legend><ol id="inputList">';
        
            if (process !== null)
                for (let i=0; i<process.inputs.length; i++)
                    output += '<li>' + this.writeProcessParameter(process.inputs[i]) + '</li>';
        
            output += '</ol><a href="#" id="lnkAddInput" onclick="return false">add new input</a></fieldset>';
        
            output += '<fieldset class="outputs"><legend>outputs</legend><ol id="outputList">';
        
            if (process !== null)
                for (let i=0; i<process.outputs.length; i++)
                    output += '<li>' + this.writeProcessParameter(process.outputs[i]) + '</li>';
        
            output += '</ol><a href="#" id="lnkAddOutput" onclick="return false">add new output</a></fieldset>';
        
            output += '<p>Note that return paths are configured within the process, and aren\'t set up through this screen.</p>';
        
            output += '<input id="btnSaveProcess" type="button" value="';
            if (process === null)
                output += 'add';
            else
                output += 'update';
            output += ' function" />';
        
            this.textDisplay.innerHTML = output;
        
            document.getElementById('lnkAddInput').addEventListener('click', this.addInputClicked.bind(this));
            document.getElementById('lnkAddOutput').addEventListener('click', this.addOutputClicked.bind(this));
            document.getElementById('btnSaveProcess').addEventListener('click', this.saveProcessClicked.bind(this));

            this.showCanvas(false);
            this.workspace.processList.populateList();
        }
        private writeProcessParameter(param: Variable) {
            let output = '<input type="text" class="name" value="'

            if (param !== null)
                output += param.name + '" data-orig="' + param.name;

            output += '" /> <select class="type">';

            for (let i = 0; i < this.workspace.types.count; i++) {
                let type = this.workspace.types.getByIndex(i);
                output += '<option value="' + i + '" style="color:' + type.color + ';"';
                if (param != null && param.type === type)
                    output += ' selected="selected"';
                output += '>' + type.name + '</option>';
            }

            output += '</select> <a href="#" class="remove" onclick="this.parentNode.parentNode.removeChild(this.parentNode); return false">remove</a>';
            return output;
        }
        private addInputClicked() {
            let item = document.createElement('li');
            item.innerHTML = this.writeProcessParameter(null);
            document.getElementById('inputList').appendChild(item);
            return false;
        }
        private addOutputClicked() {
            let item = document.createElement('li');
            item.innerHTML = this.writeProcessParameter(null);
            document.getElementById('outputList').appendChild(item);
            return false;
        }
        private saveProcessClicked() {
            let name = (<HTMLInputElement>document.getElementById('txtProcessName')).value.trim();

            let processes = this.workspace.systemProcesses;
            for (let i = 0; i < processes.count; i++)
                if (processes[i].name.trim() == name) {
                    this.workspace.showPopup('A system process already uses the name \'' + name + '\'. Please use a different one.');
                    return;
                }

            processes = this.workspace.userProcesses;
            for (let i = 0; i < processes.count; i++)
                if (processes[i] != this.currentProcess && processes[i].name.trim() == name) {
                    this.workspace.showPopup('Another process already uses the name \'' + name + '\'. Please use a different one.');
                    return;
                }

            let inputs = this.textDisplay.querySelectorAll('#inputList li');
            let outputs = this.textDisplay.querySelectorAll('#outputList li');

            let paramNames = {};
            for (let i = 0; i < inputs.length; i++) {
                let nameInput = inputs[i].querySelector('.name') as HTMLInputElement;
                let paramName = nameInput.value.trim();
                if (paramNames.hasOwnProperty(paramName)) {
                    this.workspace.showPopup('Multiple inputs have the same name: \'' + paramName + '\'. Please ensure input are unique.');
                    return;
                }
                else
                    paramNames[paramName] = true;
            }
            paramNames = {};
            for (let i = 0; i < outputs.length; i++) {
                let nameInput = outputs[i].querySelector('.name') as HTMLInputElement;
                let paramName = nameInput.value.trim();
                if (paramNames.hasOwnProperty(paramName)) {
                    this.workspace.showPopup('Multiple outputs have the same name: \'' + paramName + '\'. Please ensure output are unique.');
                    return;
                }
                else
                    paramNames[paramName] = true;
            }

            if (this.currentProcess !== null) {
                this.workspace.userProcesses.remove(this.currentProcess.name);
                this.currentProcess.name = name;
            }

            this.currentProcess = new UserProcess(name, [], [], [], [], false);
            this.currentProcess.createDefaultSteps();
            this.currentProcess.workspace = this.workspace;
            this.workspace.userProcesses.add(name, this.currentProcess);

            this.updateProcessParameters(this.currentProcess.inputs, inputs);
            this.updateProcessParameters(this.currentProcess.outputs, outputs);

            this.workspace.processList.populateList();
            this.showCanvas(true);
            this.draw();
        }
        private updateProcessParameters(parameters: Variable[], listItems: NodeListOf<Element>) {
            let oldParameters = parameters.slice();

            for (let i = 0; i < listItems.length; i++) {
                let item = listItems[i];

                let typeInput = item.querySelector('.type') as HTMLSelectElement;
                let typeIndex = parseInt(typeInput.value);
                if (isNaN(typeIndex) || typeIndex < 0 || typeIndex >= this.workspace.types.count) {
                    continue;
                }
                let type = this.workspace.types.getByIndex(typeIndex);

                let nameInput = item.querySelector('.name') as HTMLInputElement;
                let name = nameInput.value.trim();

                let origName = nameInput.getAttribute('data-orig');
                if (origName === null || origName == '') {
                    parameters.push(new Variable(name, type));
                    continue; // new parameter
                }

                let origParam = null; // existing parameter
                for (let j = 0; j < oldParameters.length; j++) {
                    let origParam = oldParameters[j];
                    if (origParam.name == origName) {
                        origParam.name = name;
                        origParam.type = type;
                        oldParameters.splice(j, 1);
                        break;
                    }
                }
            }

            // remove any parameters which weren't in the UI (cos they must have been removed)
            for (let i = 0; i < oldParameters.length; i++) {
                let oldParam = oldParameters[i];
                for (let j = 0; j < parameters.length; j++)
                    if (parameters[j] === oldParam)
                        parameters.splice(j, 1);
            }
        }
        private dropProcess(name: string, x: number, y: number) {
            let process: Process = this.workspace.systemProcesses.getByName(name);
            if (process === undefined)
                process = this.workspace.userProcesses.getByName(name);
        
            if (process === undefined) {
                this.workspace.showError('Dropped unrecognised process: ' + name);
                return;
            }

            let step = new Step(this.currentProcess.getNextStepID(), process, this.currentProcess, x, y)
            step.createDanglingReturnPaths();
            this.currentProcess.steps.push(step);
            this.draw();
        }
        variablesUpdated() {
            this.variableRegions = [];
            let vars = this.currentProcess.variables;
        
            let createRegion = this.createVariableRegion.bind(this);
        
            let x = this.titleEndX + 120;
            let xPadding = 5;
        
            for (let i=0; i<vars.length; i++) {
                x += this.createVariableRegion(vars[i], x, xPadding) + xPadding;
            }
        }
        private createVariableRegion(variable: Variable, x: number, xPadding: number) {
            let ctx = this.getContext();
            let textWidth = ctx.measureText(variable.name).width;
            let regionWidth = textWidth + xPadding + xPadding;
            let textRegion = new Region(
                function (ctx) { ctx.rect(x, 22, regionWidth, 20); },
                function (ctx, isMouseOver, isMouseDown) {
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.font = '16px sans-serif';
                    ctx.strokeStyle = ctx.fillStyle = variable.type.color;

                    ctx.fillText(variable.name, x + xPadding, 40);

                    if (isMouseOver) {
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(x + xPadding, 41);
                        ctx.lineTo(x + xPadding + textWidth, 41);
                        ctx.stroke();
                    }
                },
                'pointer'
            );

            textRegion.click = function () {
                console.log('show region edit dialog');
                return true;
            };

            let hover = function () {
                this.hoverVariable = variable;
                return true;
            }.bind(this);

            let unhover = function () {
                this.hoverVariable = null;
                return true;
            }.bind(this);

            textRegion.hover = hover;
            textRegion.unhover = unhover;

            textRegion.centerX = x + xPadding + textWidth / 2;
            this.variableRegions.push(textRegion);

            let connectorRegion = new Region(
                function (ctx) { ctx.rect(x, 22, regionWidth, 36); },
                function (ctx, isMouseOver, isMouseDown) {
                    if (!isMouseOver && this.highlightType !== variable.type)
                        return;

                    ctx.strokeStyle = ctx.fillStyle = variable.type.color;

                    let midX = x + xPadding + textWidth / 2;
                    let halfLength = 4, topY = 43;
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(midX, topY);
                    ctx.lineTo(midX, topY + halfLength + halfLength);
                    ctx.moveTo(midX - halfLength, topY + halfLength);
                    ctx.lineTo(midX + halfLength, topY + halfLength);
                    ctx.stroke();
                }.bind(this),
                'crosshair'
            );
            connectorRegion.hover = hover;
            connectorRegion.unhover = unhover;
            this.variableRegions.push(connectorRegion);

            return regionWidth;
        }

        highlightVariables(type) {
            this.highlightType = type;
        }
        draw() {
            if (this.currentProcess == null)
                return;
            let ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.root.offsetWidth, this.root.offsetHeight);
            ctx.lineCap = 'round';
        
            let steps = this.currentProcess.steps, step;
            for (let i=steps.length - 1; i>=0; i--) {
                step = steps[i];
            
                for (let j=0; j<step.returnPaths.length; j++)
                    step.returnPaths[j].draw(ctx);
            }
        
            // draw in opposite order to getRegion, so that topmost (visible) regions are the ones you can interact with
            for (let i=steps.length - 1; i>=0; i--) {
                step = steps[i];
                for (let j=step.regions.length - 1; j>=0; j--)
                    step.regions[j].callDraw(ctx, this);
                
                let paths = step.returnPaths;
                for (let j=paths.length - 1; j>=0; j--) {
                    let path = paths[j];
                    for (let k=0; k<path.regions.length; k++)
                        path.regions[k].callDraw(ctx, this);
                }
            }

            for (let i=this.fixedRegions.length - 1; i>=0; i--)
                this.fixedRegions[i].callDraw(ctx, this);
            
            for (let i=this.variableRegions.length - 1; i>=0; i--)
                this.variableRegions[i].callDraw(ctx, this);
        
            if (this.hoverVariable !== null) {
                let varNumber = this.currentProcess.variables.indexOf(this.hoverVariable);
                let region = this.variableRegions[varNumber * 2];
                let fromX = region.centerX, fromY = 50;
            
                for (let i=0; i<this.hoverVariable.links.length; i++)
                    Connector.drawPath(ctx, this.hoverVariable.links[i], fromX, fromY);
            }
        }
    }
}