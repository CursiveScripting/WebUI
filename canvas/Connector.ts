namespace Cursive {
    export class Connector {
        readonly step: Step;
        private readonly angle: number;
        readonly param: Variable;
        private readonly input: boolean;
        region: Region;

        private linkLength: number;
        private linkBranchLength: number;
        private outputBranchAngle: number;
        private inputBranchAngle: number;
        private textDistance: number;
        private mouseDown: boolean;
        private dragging: boolean;

        private dragEndX: number;
        private dragEndY: number;

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
            this.mouseDown = false;
            this.dragging = false;
    
            this.createRegion();
        }
        createRegion() {
            this.region = new Region(
                this.outline.bind(this),
                this.draw.bind(this),
                'crosshair'
            );
            this.region.hover = this.regionHover.bind(this);
            this.region.unhover = this.regionUnhover.bind(this);
            this.region.mousedown = this.regionMouseDown.bind(this);
            this.region.mouseup = this.regionMouseUp.bind(this);
            this.region.move = this.regionMove.bind(this);
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
            this.mouseDown = true;
            let editor = this.step.parentProcess.workspace.processEditor;
            editor.highlightVariables(this.param.type);
            editor.draw();
            return true;
        }
        private regionMouseUp(x: number, y: number) {
            this.mouseDown = false;

            if (!this.dragging && this.input && this.param.type.allowInput) {
                this.step.process.workspace.processEditor.showFixedInput(this, this.param);
                return false;
            }

            let editor = this.step.parentProcess.workspace.processEditor;
            editor.highlightVariables(null);

            let ctx = editor.getContext();
            let variables = editor.currentProcess.variables;
            for (let i = 0; i < editor.variableRegions.length; i++) {
                let region = editor.variableRegions[i];

                if (!region.containsPoint(ctx, x, y))
                    continue;

                let variableIndex = i % 2 == 0 ? i / 2 : (i - 1) / 2; // there's two regions for each
                let variable = variables[variableIndex];

                if (variable.type !== this.param.type)
                    break;

                for (let j = 0; j < this.param.links.length; j++) {
                    let oldVarLinks = this.param.links[j].links;
                    let index = oldVarLinks.indexOf(this);
                    if (index > -1)
                        oldVarLinks.splice(index, 1);
                }
                this.param.links = [variable];
                this.param.initialValue = null;
                variable.links.push(this);
            }

            this.dragEndX = undefined;
            this.dragEndY = undefined;
            this.dragging = false;
            editor.draw();
            return true;
        }
        private regionMove(x: number, y: number) {
            if (!this.mouseDown)
                return false;

            this.dragging = true;

            this.dragEndX = x;
            this.dragEndY = y;
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
        
            if (this.dragging)
                Connector.drawPath(ctx, this, this.dragEndX, this.dragEndY);
        }
        offset(x: number, y: number, distance: number, angle: number) {
            return {
                x: x + distance * Math.cos(angle),
                y: y + distance * Math.sin(angle)
            };
        }
        static drawPath(ctx: CanvasRenderingContext2D, connector: Connector, toX: number, toY: number) {
            ctx.strokeStyle = connector.param.type.color;
            ctx.lineWidth = 3;

            let edgePos = connector.offset(connector.step.x, connector.step.y, connector.step.radius + connector.linkLength, connector.angle);
            let cp1 = connector.offset(connector.step.x, connector.step.y, connector.step.radius * 5, connector.angle);
            let cp2x = toX, cp2y = toY + 200;
    
            Drawing.drawCurve(ctx, edgePos.x, edgePos.y, cp1.x, cp1.y, cp2x, cp2y, toX, toY);
        }
    }
}