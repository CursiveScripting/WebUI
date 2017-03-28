namespace Cursive {
    export class ReturnPath {
        private readonly fromStep: Step;
        private _toStep: Step;
        private endOffsetX?: number;
        private endOffsetY?: number;
        readonly name: string;
        warnDuplicate: boolean = false;
        onlyPath: boolean = false;
        private nameLength: number = 30;
        private dragging: boolean = false;

        readonly regions: Region[];
        private midArrowTransform: Transform;
        private endConnectorTranform: Transform;

        constructor(fromStep: Step, toStep: Step, name: string, endOffsetX?: number, endOffsetY?: number) {
            this.fromStep = fromStep;
            this._toStep = toStep;
            
            if (endOffsetX === undefined && toStep !== null && fromStep != null) {
                endOffsetX = toStep.x - fromStep.x;
                endOffsetY = toStep.y - fromStep.y;
            }

            this.endOffsetX = endOffsetX;
            this.endOffsetY = endOffsetY;
            this.name = name;
    
            let pathName = new Region(
                this.definePathNameRegion.bind(this),
                this.drawName.bind(this),
                'default'
            );
    
            let midArrow = new Region(
                this.defineMidArrowRegion.bind(this),
                this.drawMidArrowRegion.bind(this),
                'move'
            );
            midArrow.hover = function () { return true; };
            midArrow.unhover = function () { return true; };
            midArrow.mousedown = this.dragStart.bind(this);
            midArrow.mouseup = this.dragStop.bind(this);
            midArrow.move = this.dragMove.bind(this);

            let endConnector = new Region(
                this.defineEndConnectorRegion.bind(this),
                this.drawEndConnectorRegion.bind(this),
                'move'
            );
            endConnector.hover = function () { return true; };
            endConnector.unhover = function () { return true; };
            endConnector.mousedown = this.dragStart.bind(this);
            endConnector.mouseup = this.dragStop.bind(this);
            endConnector.move = this.dragMove.bind(this);

            this.regions = [pathName, midArrow, endConnector];
        }
        get toStep(): Step {
            return this._toStep;
        }
        private getNameToWrite() {
            return this.name !== null ? this.name : this.onlyPath ? null : 'default';
        }
        private defineMidArrowRegion(ctx: CanvasRenderingContext2D) {
            ctx.save();
            this.midArrowTransform.apply(ctx);
            let halfWidth = 8, arrowLength = 20;
            ctx.rect(-arrowLength - 1, -halfWidth - 1, arrowLength + 2, halfWidth * 2 + 2);
            ctx.restore();
        }
        private definePathNameRegion(ctx: CanvasRenderingContext2D) {
            if (this.getNameToWrite() === null)
                return;

            ctx.save();

            this.midArrowTransform.apply(ctx);
            ctx.translate(-26, 0);

            ctx.rect(-this.nameLength - 5, -10, this.nameLength + 10, 20);

            ctx.restore();
        }
        private drawName(ctx: CanvasRenderingContext2D) {
            let writeName = this.getNameToWrite();
            if (writeName === null)
                return;
        
            ctx.save();
            let transform = this.midArrowTransform;
            transform.apply(ctx);
            ctx.translate(-26, 0);
    
            ctx.shadowBlur = 14;
            ctx.textAlign = 'right';
        
            if (transform.angle > Math.PI / 2 || transform.angle <= -Math.PI / 2) {
                ctx.rotate(Math.PI);
                ctx.textAlign = 'left';
            }
        
            if (writeName !== null)
            {
                ctx.shadowColor = ctx.fillStyle = this.warnDuplicate ? '#f99' : '#fff';
                ctx.font = '16px sans-serif';
                ctx.textBaseline = 'middle';
            
                this.nameLength = ctx.measureText(writeName).width;
                for (let i=0; i<12; i++) // strengthen the shadow
                    ctx.fillText(writeName, 0, 0);

                ctx.fillStyle = '#000';
                ctx.fillText(writeName, 0, 0);
            }
        
            ctx.restore();
        }
        private defineEndConnectorRegion(ctx: CanvasRenderingContext2D) {
            if (this._toStep != null)
                return;

            ctx.save();
            this.endConnectorTranform.apply(ctx);
            let radius = 8;
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.restore();
        }
        private drawEndConnectorRegion(ctx: CanvasRenderingContext2D) {
            if (this._toStep != null)
                return;

            ctx.save();
            this.endConnectorTranform.apply(ctx);

            let radius = 8;

            ctx.beginPath();
            ctx.fillStyle = this._toStep == null && !this.dragging ? '#f00' : '#fff';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            ctx.restore();
        }
        private drawMidArrowRegion(ctx: CanvasRenderingContext2D) {
            ctx.save();
            this.midArrowTransform.apply(ctx);

            let halfWidth = 8, arrowLength = 20;
    
            ctx.shadowOffsetX = 0; 
            ctx.shadowOffsetY = 0; 
            
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.fillStyle = this._toStep == null && !this.dragging ? '#f00' : '#fff';
    
            ctx.beginPath();
            ctx.moveTo(-arrowLength, halfWidth);
            ctx.lineTo(0,0);
            ctx.lineTo(-arrowLength, -halfWidth);
            ctx.closePath();
            ctx.fill();
    
            ctx.beginPath();
            ctx.moveTo(-arrowLength, halfWidth);
            ctx.lineTo(0,0);
            ctx.lineTo(-arrowLength, -halfWidth);
            ctx.closePath();
            ctx.stroke();

            ctx.restore();
        }
        draw(ctx: CanvasRenderingContext2D) {
            let fromX = this.fromStep.x, fromY = this.fromStep.y;
            let toX: number, toY: number;
            if (this._toStep == null) {
                toX = this.fromStep.x + this.endOffsetX;
                toY = this.fromStep.y + this.endOffsetY;
            }
            else {
                toX = this._toStep.x;
                toY = this._toStep.y;
            }

            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
    
            let dx = toX - fromX, dy = toY - fromY, m = dx === 0 ? dy > 0 ? 999 : -999 : Math.abs(dy/dx);
            let cp1x = fromX + dx / 5, cp1y = fromY + dy / 5, cp2x = toX - dx / 5, cp2y = toY - dy / 5;

            // need to curve if near horizontal (and i/o connectors will get in the way)
            let minCurveGradient = 0.1;
            m = Math.abs(m);
            if (this.fromStep === this.toStep) {
                cp1x = cp2x = fromX + 140;
                cp1y += 200;
                cp2y -= 200;
            }
            else if (m < minCurveGradient) {
                let curveScale = (minCurveGradient - m) / minCurveGradient;
                let yOffset = 50 * curveScale;

                if (dx < 0) {
                    if (this.fromStep.inputs != null && this.fromStep.inputs.length % 2 == 1)
                        cp1y += dy > 0 ? yOffset : -yOffset;
                    if (this._toStep != null && this._toStep.outputs != null && this._toStep.outputs.length % 2 == 1)
                        cp2y += dy > 0 ? -yOffset : yOffset;
                }
                else {
                    if (this.fromStep.outputs != null && this.fromStep.outputs.length % 2 == 1)
                        cp1y += dy > 0 ? yOffset : -yOffset;
                    if (this._toStep != null && this._toStep.inputs != null && this._toStep.inputs.length % 2 == 1)
                        cp2y += dy > 0 ? -yOffset : yOffset;
                }
            }
    
            Drawing.drawCurve(ctx, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);

            let tx: number, ty: number, angle: number;
            if (this._toStep == null) {
                // handle goes at the end of the line
                this.endConnectorTranform = new Transform(toX, toY, 0);
            }

            // handle goes at the middle of the line
            let mid1x = (fromX + cp1x + cp1x + cp2x) / 4, mid1y = (fromY + cp1y + cp1y + cp2y) / 4;
            let mid2x = (toX + cp2x + cp2x + cp1x) / 4, mid2y = (toY + cp2y + cp2y + cp1y) / 4;
            angle = Math.atan2((mid2y - mid1y), (mid2x - mid1x));
            tx = (mid1x + mid2x) / 2;
            ty = (mid1y + mid2y) / 2;
            this.midArrowTransform = new Transform(tx, ty, angle);
        }
        private dragStart(x: number, y: number) {
            this._toStep = null;
            this.updateOffset(x, y);
            this.dragging = true;
            return true;
        }
        private dragStop(x: number, y: number) {
            if (!this.dragging)
                return false;

            this.updateOffset(x, y);
            this.dragging = false;
            let otherStep = this.fromStep.parentProcess.workspace.processEditor.getStep(x, y);
            if (otherStep instanceof StartStep)
                return false;

            this._toStep = otherStep;
            // TODO: if other return paths from this step already go to the same destination, combine them into one somehow
            return true;
        }
        private dragMove(x: number, y: number) {
            if (!this.dragging)
                return false;
        
            this.updateOffset(x, y);
            return true;
        }
        private updateOffset(x: number, y: number) {
            this.endOffsetX = x - this.fromStep.x;
            this.endOffsetY = y - this.fromStep.y;
        }
        isConnected() {
            return this._toStep !== null;
        }
        disconnect() {
            this._toStep = null;
        }
    }
}