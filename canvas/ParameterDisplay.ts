namespace Cursive {
    export class ParameterDisplay {
        region: Region;

        private linkLength: number;
        private linkBranchLength: number;
        private outputBranchAngle: number;
        private inputBranchAngle: number;
        private textDistance: number;
        private angle: number;
        private drawText: boolean;

        constructor(readonly step: Step, angle: number, readonly param: Parameter, readonly isInput: boolean) {
            this.linkLength = 18;
            this.linkBranchLength = 6;
            this.outputBranchAngle = Math.PI * 0.8;
            this.inputBranchAngle = Math.PI - this.outputBranchAngle;
            this.textDistance = 30;
            this.angle = angle;
            this.drawText = false;

            this.createRegion();
        }
        createRegion() {
            this.region = new Region(
                this.defineRegion.bind(this),
                this.draw.bind(this),
                'pointer'
            );
            this.region.hover = this.regionHover.bind(this);
            this.region.unhover = this.regionUnhover.bind(this);
            this.region.mousedown = this.regionMouseDown.bind(this);
            this.region.mouseup = this.regionMouseUp.bind(this);
        }
        private regionHover() {
            this.drawText = true;
            this.step.parentProcess.workspace.variableListDisplay.highlight(this.param.link);
            return true;
        }
        private regionUnhover() {
            this.drawText = false;
            this.step.parentProcess.workspace.variableListDisplay.highlight(null);
            return true;
        }
        private regionMouseDown(x: number, y: number) {   
            return false;
        }
        private regionMouseUp(x: number, y: number) {
            this.step.parentProcess.workspace.parameterEditor.show(this);
            return true;
        }
        defineRegion(ctx: CanvasRenderingContext2D) {
            let halfAngle = Math.PI / 24;
            let offset = this.offsetStep(0, this.angle);
            
            let pos1 = this.offset(offset.x, offset.y, this.linkBranchLength, offset.angle + Math.PI / 2)
            let pos2 = this.offset(offset.x, offset.y, this.linkBranchLength, offset.angle - Math.PI / 2)
            let pos3 = this.offset(pos1.x, pos1.y, this.textDistance, offset.angle + halfAngle);
            let pos4 = this.offset(pos2.x, pos2.y, this.textDistance, offset.angle - halfAngle);
            ctx.moveTo(pos1.x, pos1.y);
            ctx.lineTo(pos2.x, pos2.y);
            ctx.lineTo(pos4.x, pos4.y);
            ctx.lineTo(pos3.x, pos3.y);
            ctx.lineTo(pos1.x, pos1.y);
        }
        draw(ctx: CanvasRenderingContext2D, isMouseOver: boolean, isMouseDown: boolean) {
            ctx.fillStyle = ctx.strokeStyle = this.param.type.color;
            ctx.lineWidth = 4;
        
            ctx.beginPath();
            let offset = this.offsetStep(2, this.angle);
            let startPos: Position = offset;
            ctx.moveTo(offset.x, offset.y);
            let endPos = this.offset(offset.x, offset.y, this.linkLength, offset.angle);
            ctx.lineTo(endPos.x, endPos.y);
        
            if (this.isInput) {
                let tmp = startPos;
                startPos = endPos;
                endPos = tmp;
            }
        
            let sidePos1 = this.offset(endPos.x, endPos.y, this.linkBranchLength, this.isInput ? offset.angle + this.inputBranchAngle : offset.angle + this.outputBranchAngle);
            let sidePos2 = this.offset(endPos.x, endPos.y, this.linkBranchLength, this.isInput ? offset.angle - this.inputBranchAngle : offset.angle - this.outputBranchAngle);
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

            if (this.step.drawText || this.drawText || (this.param.link !== null && this.step.parentProcess.workspace.processEditor.highlightVariable === this.param.link)) {
                ctx.font = '12px sans-serif';
                ctx.textAlign = this.isInput ? 'right' : 'left';
                ctx.textBaseline = 'middle';

                let pos = this.offset(offset.x, offset.y, this.textDistance, offset.angle);
                ctx.fillText(this.param.name, pos.x, pos.y);
            }
        }
        offsetStep(extraDistance: number, angle: number) {
            let perpendicular = this.step.getPerpendicular(angle);
            return new Orientation(
                perpendicular.x + extraDistance * Math.cos(perpendicular.angle),
                perpendicular.y + extraDistance * Math.sin(perpendicular.angle),
                perpendicular.angle
            );
        }
        offset(x: number, y: number, distance: number, angle: number) {
            return new Position(
                x + distance * Math.cos(angle),
                y + distance * Math.sin(angle)
            );
        }
    }
}