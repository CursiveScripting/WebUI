﻿namespace Cursive {
    export class EditorCanvas {
        private readonly workspace: Workspace;
        currentProcess: UserProcess;
        highlightVariable: Variable;
        hoverRegion: Region;
        mouseDownRegion: Region;
        fixedRegions: Region[];
        private canvas: HTMLCanvasElement;
        private canvasWidth: number;
        private headerCutoff: number;

        constructor(workspace: Workspace, canvas: HTMLCanvasElement) {
            this.workspace = workspace;
            this.canvas = canvas;
            this.highlightVariable = null;
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
            if (region != null && region.mousedown(pos.x, pos.y)) {
                this.processChanged();
                this.draw();
            }
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

            if (draw) {
                this.processChanged();
                this.draw();
            }
        }
        private canvasMouseOut(e: MouseEvent) {
            if (this.hoverRegion != null) {
                let pos = this.getCanvasCoords(e);
                let ctx = this.canvas.getContext('2d');

                if (!this.hoverRegion.containsPoint(ctx, pos.x, pos.y)) {
                    let draw = this.hoverRegion.unhover();
                    this.hoverRegion = null;
                    this.canvas.style.cursor = '';

                    if (draw) {
                        this.processChanged();
                        this.draw();
                    }
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

            if (draw) {
                this.processChanged();
                this.draw();
            }
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
        
            // check regions from steps
            for (let step of this.currentProcess.steps) {
                for (let region of step.regions) {
                    if (region.containsPoint(ctx, x, y))
                        return region;
                }

                for (let path of step.returnPaths) {
                    for (let region of path.regions) {
                        if (region.containsPoint(ctx, x, y))
                            return region;
                    }
                }
            }
        
            // check fixed regions
            for (let region of this.fixedRegions) {
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
            this.processChanged();
            this.draw();
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
        }
        private processChanged() {
            this.currentProcess.validate();
            this.workspace.processListDisplay.populateList();
        }
        highlightConnectors(variable: Variable) {
            this.highlightVariable = variable;
            this.draw();
        }
    }
}