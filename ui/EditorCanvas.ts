namespace Cursive {
    export class EditorCanvas {
        private readonly workspace: Workspace;
        currentProcess: UserProcess;
        private highlightType: Type;
        private hoverVariable: Variable;
        hoverRegion: Region;
        mouseDownRegion: Region;
        fixedRegions: Region[];
        variableRegions: Region[];
        private canvas: HTMLCanvasElement;
        private canvasWidth: number;
        private headerCutoff: number;

        constructor(workspace: Workspace, canvas: HTMLCanvasElement) {
            this.workspace = workspace;
            this.canvas = canvas;
            this.highlightType = null;
            this.hoverVariable = null;
            this.setupUI();
        }
        loadProcess(process) {
            this.hoverRegion = null;
            this.currentProcess = process;
            this.show();
            this.draw();
        }
        updateSize() {
            let scrollSize = this.workspace.getScrollbarSize();

            let w = this.canvasWidth = this.canvas.parentElement.offsetWidth - scrollSize.width
            let h = this.canvas.parentElement.offsetHeight - scrollSize.height;
            this.canvas.setAttribute('width', w.toString());
            this.canvas.setAttribute('height', h.toString());
        
            this.draw();
        }
        private setupUI() {
            this.show();
        
            this.headerCutoff = 68;
            this.canvasWidth = 999;
        
            let stopStep = new Region(
                this.defineStopStepRegion.bind(this),
                this.drawStopStepRegion.bind(this),
                'move'
            );
            stopStep.mousedown = this.stopStepRegionMouseDown.bind(this);

            this.fixedRegions = [stopStep];
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
        show() {
            this.canvas.style.removeProperty('display');
        }
        hide() {
            this.canvas.style.display = 'none';
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
            
            //this.workspace.showPopup(content, this.fixedInputPopupConfirmed.bind(this, connector, input));
        }
        /*
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
        */
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
        highlightVariables(type) {
            this.highlightType = type;
        }
        draw() {
            if (this.currentProcess == null)
                return;
            let ctx = this.canvas.getContext('2d');
            ctx.clearRect(0, 0, this.canvas.offsetWidth, this.canvas.offsetHeight);
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