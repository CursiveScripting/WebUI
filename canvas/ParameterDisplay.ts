namespace Cursive {
    export class ParameterDisplay {
        region: Region;

        private readonly linkLength: number;
        private readonly linkBranchLength: number;
        private outputBranchAngle: number;
        private inputBranchAngle: number;
        private textDistance: number;
        private readonly angle: number;
        private drawText: boolean;

        private regionOffsets: [Position, Position, Position, Position];
        private drawingOffsets: [Orientation, Position, Position, Position, Position, Position];

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
        calculateOffsets() {
            let halfAngle = Math.PI / 24;

            let offset = this.offsetStep(0);
            let pos1 = this.offset(offset.x, offset.y, this.linkBranchLength, offset.angle + Math.PI / 2)
            let pos2 = this.offset(offset.x, offset.y, this.linkBranchLength, offset.angle - Math.PI / 2)
            let pos3 = this.offset(pos2.x, pos2.y, this.textDistance, offset.angle - halfAngle);
            let pos4 = this.offset(pos1.x, pos1.y, this.textDistance, offset.angle + halfAngle);
            this.regionOffsets = [pos2, pos3, pos4, pos1];

            offset = this.offsetStep(2);
            let startPos: Position = offset;
            let endPos = this.offset(offset.x, offset.y, this.linkLength, offset.angle);
            let midPos = this.isInput ? startPos : endPos;
            let sidePos1 = this.offset(midPos.x, midPos.y, this.linkBranchLength, this.isInput ? offset.angle + this.inputBranchAngle : offset.angle + this.outputBranchAngle);
            let sidePos2 = this.offset(midPos.x, midPos.y, this.linkBranchLength, this.isInput ? offset.angle - this.inputBranchAngle : offset.angle - this.outputBranchAngle);
            let textPos = this.offset(offset.x, offset.y, this.textDistance, offset.angle);
            this.drawingOffsets = [offset, endPos, midPos, sidePos1, sidePos2, textPos];
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
            let offset = this.regionOffsets[this.regionOffsets.length - 1];
            ctx.moveTo(offset.x, offset.y);

            for (offset of this.regionOffsets)
                ctx.lineTo(offset.x, offset.y);
        }
        draw(ctx: CanvasRenderingContext2D, isMouseOver: boolean, isMouseDown: boolean) {
            ctx.fillStyle = ctx.strokeStyle = this.param.type.color;
            ctx.lineWidth = 4;
        
            ctx.beginPath();
            let startPos: Position = this.drawingOffsets[0];
            ctx.moveTo(startPos.x, startPos.y);
            let endPos = this.drawingOffsets[1];
            ctx.lineTo(endPos.x, endPos.y);
            let midPos = this.drawingOffsets[2];
            let sidePos1 = this.drawingOffsets[3];
            let sidePos2 = this.drawingOffsets[4];
            ctx.moveTo(sidePos1.x, sidePos1.y);
            ctx.lineTo(midPos.x, midPos.y);
            ctx.lineTo(sidePos2.x, sidePos2.y);
        
            ctx.stroke();

            if (this.param.initialValue !== null) {
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(endPos.x, endPos.y, this.linkBranchLength * 0.75, 0, Math.PI * 2);
                ctx.stroke();
            }

            if (this.step.drawText || this.drawText || (this.param.link !== null && this.step.parentProcess.workspace.processEditor.highlightVariable === this.param.link)) {
                ctx.textAlign = this.isInput ? 'right' : 'left';

                let pos = this.drawingOffsets[5];
                let nameText = this.param.name;
                let valueText: string;

                ctx.fillStyle = '#666';
                ctx.font = 'italic 12px sans-serif';
                if (this.param.link !== null)
                    valueText = this.param.link.name;
                else if (this.param.initialValue !== null)
                    valueText = '"' + this.param.initialValue + '"';
                else {
                    valueText = 'not connected';
                    ctx.fillStyle = '#c00';
                    ctx.font = '12px sans-serif';
                }
                
                ctx.textBaseline = 'top';
                ctx.fillText(valueText, pos.x, pos.y + 5);
                nameText += ':';
                
                ctx.font = '12px sans-serif';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = this.param.type.color;
                ctx.fillText(nameText, pos.x, pos.y);
            }
        }
        offsetStep(extraDistance: number) {
            let perpendicular = this.step.getPerpendicular(this.angle);

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