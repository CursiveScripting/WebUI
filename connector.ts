﻿namespace Cursive {
    export class Connector {
        private readonly step: Step;
        private readonly angle: number;
        private readonly param: any;
        private readonly input: boolean;
        region: Region;

        private linkLength: number;
        private linkBranchLength: number;
        private outputBranchAngle: number;
        private inputBranchAngle: number;
        private textDistance: number;
        private dragging: boolean;

        private dragEndX: number;
        private dragEndY: number;

        constructor(step: Step, angle: number, param, isInput: boolean) {
	        this.step = step;
	        this.angle = angle;
	        this.param = param;
	        this.input = isInput;
	
	        this.linkLength = 18;
	        this.linkBranchLength = 6;
	        this.outputBranchAngle = Math.PI * 0.8;
	        this.inputBranchAngle = Math.PI - this.outputBranchAngle;
	        this.textDistance = 24;
	        this.dragging = false;
	
	        this.createRegion();
        }
	    createRegion() {
		    this.region = new Region(
			    this.outline.bind(this),
			    this.draw.bind(this),
			    'crosshair'
		    );
		    this.region.hover = function () { this.step.drawText = true; return true; }.bind(this);
		    this.region.unhover = function () { this.step.drawText = false; return true; }.bind(this);
		
		    this.region.mousedown = function (x,y) {
			    this.dragging = true;
			    this.step.editor.highlightVariables(this.param.type);
			    this.step.editor.draw();
			    return true;
		    }.bind(this);
		    this.region.mouseup = function (x,y) {
			    if (!this.dragging)
				    return false;
				
			    this.step.editor.highlightVariables(null);
			
			    let editor = this.step.editor;
			    let ctx = editor.canvas.getContext('2d');
			    let variables = editor.currentProcess.variables;
			    for (let i=0; i<editor.variableRegions.length; i++) {
				    let region = editor.variableRegions[i];
				
				    if (!region.containsPoint(ctx, x, y))
					    continue;
				
				    let variableIndex = i % 2 == 0 ? i / 2 : (i-1) / 2; // there's two regions for each
				    let variable = variables[variableIndex];
				
				    if (variable.type !== this.param.type)
					    break;
				
				    for (let j=0; j<this.param.links.length; j++) {
					    let oldVarLinks = this.param.links[j].links;
					    let index = oldVarLinks.indexOf(this);
					    if (index > -1)
						    oldVarLinks.splice(index, 1);
				    }
				    this.param.links = [variable];
				    variable.links.push(this);
			    }
			
			    this.dragEndX = undefined;
			    this.dragEndY = undefined;
			    this.dragging = false;
			    editor.draw();
			    return true;
		    }.bind(this);
		    this.region.move = function (x,y) {
			    if (!this.dragging)
				    return false;
			
			    this.dragEndX = x;
			    this.dragEndY = y;
			    return true;
		    }.bind(this);
	    }
	    outline(ctx) {
		    let halfAngle = Math.PI / 24;
		    let pos = this.offset(this.step.x, this.step.y, this.step.radius + 2, this.angle - halfAngle);
		    ctx.moveTo(pos.x, pos.y);
		    pos = this.offset(this.step.x, this.step.y, this.step.radius + 2, this.angle + halfAngle);
		    ctx.lineTo(pos.x, pos.y);
		    pos = this.offset(this.step.x, this.step.y, this.step.radius + this.textDistance, this.angle + halfAngle);
		    ctx.lineTo(pos.x, pos.y);
		    pos = this.offset(this.step.x, this.step.y, this.step.radius + this.textDistance, this.angle - halfAngle);
		    ctx.lineTo(pos.x, pos.y);
	    }
	    draw(ctx, isMouseOver, isMouseDown) {
		    ctx.fillStyle = ctx.strokeStyle = this.param.type.color;
		    ctx.font = '12px sans-serif';
		    ctx.textAlign = this.input ? 'right' : 'left';
		    ctx.textBaseline = 'middle';
		    ctx.lineWidth = 4;
		
		    ctx.beginPath();
		    let startPos = this.offset(this.step.x, this.step.y, this.step.radius + 2, this.angle);
		    ctx.moveTo(startPos.x, startPos.y);
		    let endPos = this.offset(this.step.x, this.step.y, this.step.radius + this.linkLength, this.angle);
		    ctx.lineTo(endPos.x, endPos.y);
		
		    if (this.input) {
			    let tmp = startPos;
			    startPos = endPos;
			    endPos = tmp;
		    }
		
		    let sidePos1 = this.offset(endPos.x, endPos.y, this.linkBranchLength, this.input ? this.angle + this.inputBranchAngle : this.angle + this.outputBranchAngle);
		    let sidePos2 = this.offset(endPos.x, endPos.y, this.linkBranchLength, this.input ? this.angle - this.inputBranchAngle : this.angle - this.outputBranchAngle);
		    ctx.moveTo(sidePos1.x, sidePos1.y);
		    ctx.lineTo(endPos.x, endPos.y);
		    ctx.lineTo(sidePos2.x, sidePos2.y);
		
		    ctx.stroke();
		
		    if (this.step.drawText) {
			    let pos = this.offset(this.step.x, this.step.y, this.textDistance + this.step.radius, this.angle);
			    ctx.fillText(this.param.name, pos.x, pos.y);
		    }
		
		    if (this.dragging)
			    Connector.drawPath(ctx, this, this.dragEndX, this.dragEndY);
	    }
	    offset(x, y, distance, angle) {
		    return {
			    x: x + distance * Math.cos(angle),
			    y: y + distance * Math.sin(angle)
		    };
	    }
        static drawPath(ctx, connector, toX, toY) {
	        ctx.strokeStyle = connector.param.type.color;
	        ctx.lineWidth = 3;

	        let edgePos = connector.offset(connector.step.x, connector.step.y, connector.step.radius + connector.linkLength, connector.angle);
	        let cp1 = connector.offset(connector.step.x, connector.step.y, connector.step.radius * 5, connector.angle);
	        let cp2x = toX, cp2y = toY + 200;
	
	        connector.step.editor.drawCurve(ctx, edgePos.x, edgePos.y, cp1.x, cp1.y, cp2x, cp2y, toX, toY);
        }
    }
}