/// <reference path="processeditor.ts" />
namespace Cursive {
    export class Step {
        private readonly process: Process;
        x: number;
        y: number;
        readonly returnPaths: ReturnPath[];
        readonly radius: number;
        drawText: boolean;
        private dragging: boolean;
        private draggingPath: boolean;
        private connectors: Connector[];
        regions: Region[];
        private returnConnectorRegion: Region;
        private bodyRegion: Region;
        private collisionRegion: Region;
        editor: ProcessEditor;
        private dragEndX: number;
        private dragEndY: number;

        constructor(process: Process, x: number, y: number) {
	        this.process = process;
	        this.x = x;
	        this.y = y;
	        this.returnPaths = [];
	        this.radius = 45;
	        this.drawText = this.dragging = this.draggingPath = false;
	        this.createRegions();
        }
	    createRegions() {
		    this.connectors = [];
		    this.regions = [];
		
		    let returnStartSize = 2.5, returnStartOffset = 20;
		    this.returnConnectorRegion = new Region(
			    function (ctx) { ctx.arc(this.x, this.y + returnStartOffset, returnStartSize * 3.5, 0, 2 * Math.PI);}.bind(this),
			    function (ctx, isMouseOver, isMouseDown) {
				    ctx.lineWidth = 2;
				    ctx.strokeStyle = isMouseOver || isMouseDown ? '#000' : '#999';
				    ctx.beginPath();
				    ctx.moveTo(this.x - returnStartSize, this.y + returnStartOffset);
				    ctx.lineTo(this.x + returnStartSize, this.y + returnStartOffset);
				    ctx.moveTo(this.x, this.y - returnStartSize + returnStartOffset);
				    ctx.lineTo(this.x, this.y + returnStartSize + returnStartOffset);
				    ctx.stroke();
			    }.bind(this),
			    'crosshair'
		    );
		    this.returnConnectorRegion.hover = function () { return true; };
		    this.returnConnectorRegion.unhover = function () { return true; };
		    this.returnConnectorRegion.mousedown = this.startDragPath.bind(this);
		    this.returnConnectorRegion.mouseup = this.stopDragPath.bind(this);
		    this.returnConnectorRegion.move = this.moveDragPath.bind(this);
		    this.regions.push(this.returnConnectorRegion);
		
		    this.bodyRegion = new Region(
			    function (ctx) { ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI); }.bind(this),
			    this.drawBody.bind(this),
			    'move'
		    );
		
		    this.bodyRegion.mousedown = function (x,y) {
			    this.dragging = true;
			    this.moveOffsetX = this.x - x;
			    this.moveOffsetY = this.y - y;
			    return true;
		    }.bind(this);
		
		    this.bodyRegion.mouseup = function (x,y) {
			    this.dragging = false;
			    return true;
		    }.bind(this);
		
		    this.bodyRegion.hover = function () {
			    this.drawText = true; return true;
		    }.bind(this);
		
		    this.bodyRegion.move = function (x,y) {
			    if (!this.dragging)
				    return false;
			
			    // test for collisions
			    let steps = this.editor.currentProcess.steps;
			    let ctx = this.editor.canvas.getContext('2d');

			    for (let i=0; i<steps.length; i++) {
				    if (steps[i] === this)
					    continue;
				
				    if (steps[i].collisionRegion.containsPoint(ctx, x + this.moveOffsetX, y + this.moveOffsetY))
					    return;
			    }
			
			    this.x = x + this.moveOffsetX;
			    this.y = y + this.moveOffsetY;
			    return true;
		    }.bind(this);
		
		    this.bodyRegion.unhover = function (x, y) {
			    if (!this.dragging)
				    this.drawText = false;
			
			    return true;
		    }.bind(this);
		
		    this.regions.push(this.bodyRegion);
		
		    this.collisionRegion = new Region( // twice the normal radius, so that another step can't overlap this one
			    function (ctx) { ctx.arc(this.x, this.y, this.radius * 2, 0, 2 * Math.PI); }.bind(this)
		    );
		
		    this.createConnectors(this.process.inputs, true);
		    this.createConnectors(this.process.outputs, false);
	    }
	    drawBody(ctx) {
		    ctx.strokeStyle = '#000';
		    ctx.fillStyle = '#fff';
		    ctx.lineWidth = 2;
		    ctx.beginPath();
		    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		    ctx.fill();
		    ctx.beginPath();
		    ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		    ctx.stroke();
		
		    ctx.font = '16px sans-serif';
		    ctx.textAlign = 'center';
		    ctx.textBaseline = 'middle';
		    ctx.fillStyle = '#000';
		    ctx.fillText(this.process.name, this.x, this.y);
	    }
	    createConnectors(params, input) {
		    let angularSpread;
		    switch (params.length) {
			    case 0: return;
			    case 1: angularSpread = 0; break;
			    case 2: angularSpread = 60; break;
			    case 3: angularSpread = 90; break;
			    case 4: angularSpread = 110; break;
			    case 5: angularSpread = 120; break;
			    case 6: angularSpread = 130; break;
			    default: angularSpread = 140; break;
		    }
		    angularSpread *= Math.PI / 180;
		
		    let centerAngle = input ? Math.PI : 0;
		
		    let stepSize = params.length == 1 ? 0 : angularSpread / (params.length - 1);
		    let currentAngle = input ? centerAngle + angularSpread / 2 : centerAngle - angularSpread / 2;
		    if (input)
			    stepSize = -stepSize;
				
		    for (let i=0; i<params.length; i++) {
			    let connector = new Connector(this, currentAngle, params[i], input);
			    this.connectors.push(connector);
			    this.regions.push(connector.region);
			    currentAngle += stepSize;
		    }
	    }
	    startDragPath(x,y) {
		    this.draggingPath = true;
		    return true;
	    }
	    stopDragPath(x,y) {
		    if (!this.draggingPath)
			    return false;
		
		    let toStep = this.editor.getStep(x, y);
		    if (toStep !== null) {
			    let existingPath = null;
			    for (let i=0; i<this.returnPaths.length; i++)
				    if (toStep === this.returnPaths[i].toStep) {
					    existingPath = this.returnPaths[i];
					    // TODO: explain to user that they should set up multiple return paths to the same destination through a single link
					    break;
				    }
			
			    if (existingPath === null) {
				    let newPath = new ReturnPath(this, toStep, null);
				
				    for (let i=0; i<this.returnPaths.length; i++) {
					    let existing = this.returnPaths[i];
					    existing.onlyPath = false;
					    if (existing.name === null) {
						    existing.warnDuplicate = newPath.warnDuplicate = true;
					    }
				    }
				
				    newPath.onlyPath = this.returnPaths.length == 0;
				    this.returnPaths.push(newPath);
			    }
		    }
		
		    this.dragEndX = undefined;
		    this.dragEndY = undefined;
		    this.draggingPath = false;
		    return true;
	    }
	    moveDragPath(x,y) {
		    if (!this.draggingPath)
			    return false;
		
		    this.dragEndX = x;
		    this.dragEndY = y;
		    return true;
	    }
    }
}