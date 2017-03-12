﻿namespace Cursive {
    export class Connector {
        readonly step: Step;
        private readonly angle: number;
        readonly param: Variable;
        readonly input: boolean;
        region: Region;

        private linkLength: number;
        private linkBranchLength: number;
        private outputBranchAngle: number;
        private inputBranchAngle: number;
        private textDistance: number;

        constructor(step: Step, angle: number, param: Variable, isInput: boolean) {
            this.step = step;
            this.angle = angle;
            this.param = param;
            this.input = isInput;
    
            this.linkLength = 18;
            this.linkBranchLength = 6;
            this.outputBranchAngle = Math.PI * 0.8;
            this.inputBranchAngle = Math.PI - this.outputBranchAngle;
            this.textDistance = 24;
    
            this.createRegion();
        }
        createRegion() {
            this.region = new Region(
                this.outline.bind(this),
                this.draw.bind(this),
                'pointer'
            );
            this.region.hover = this.regionHover.bind(this);
            this.region.unhover = this.regionUnhover.bind(this);
            this.region.mousedown = this.regionMouseDown.bind(this);
            this.region.mouseup = this.regionMouseUp.bind(this);
        }
        private regionHover() {
            this.step.drawText = true;
            return true;
        }
        private regionUnhover() {
            this.step.drawText = false;
            return true;
        }
        private regionMouseDown(x: number, y: number) {
            let editor = this.step.parentProcess.workspace.processEditor;
            editor.highlightVariables(this.param.type);
            editor.draw();
            return true;
        }
        private regionMouseUp(x: number, y: number) {
            this.step.parentProcess.workspace.parameterEditor.show(this);
            return true;
        }
        outline(ctx: CanvasRenderingContext2D) {
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
        draw(ctx: CanvasRenderingContext2D, isMouseOver: boolean, isMouseDown: boolean) {
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

            if (this.param.initialValue !== null) {
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(startPos.x, startPos.y, this.linkBranchLength * 0.75, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (this.step.drawText) {
                let pos = this.offset(this.step.x, this.step.y, this.textDistance + this.step.radius, this.angle);
                ctx.fillText(this.param.name, pos.x, pos.y);
            }
        }
        offset(x: number, y: number, distance: number, angle: number) {
            return {
                x: x + distance * Math.cos(angle),
                y: y + distance * Math.sin(angle)
            };
        }
    }
}