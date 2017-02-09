namespace Cursive {
    export class ReturnPath {
        private readonly fromStep: Step;
        private toStep: Step;
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

        constructor(fromStep, toStep, name, endOffsetX?: number, endOffsetY?: number) {
	        this.fromStep = fromStep;
	        this.toStep = toStep;
            this.endOffsetX = endOffsetX;
            this.endOffsetY = endOffsetY;
	        this.name = name;
	
	        let pathName = new Region(
		        function (ctx) {
			        if (this.getNameToWrite() === null)
				        return;
			
			        ctx.save();
			
			        this.midArrowTransform.apply(ctx);
			        ctx.translate(-26, 0);
			
			        ctx.rect(-this.nameLength - 5, -10, this.nameLength + 10, 20);
			
			        ctx.restore();
		        }.bind(this),
		        this.drawName.bind(this),
		        'pointer'
	        );
	
	        pathName.click = function (x, y) {
		        let paths = this.fromStep.process.returnPaths;
		        let content, action;
		        if (paths.length < 2)
			        content = 'Only one path can come from this process,<br />as it doesn\'t have multiple return paths.<br />Please remove the extra path(s).';
		        else {
			        content = 'Select the return path to use:<br/><select class="returnPath"><option value="">[default]</option>';
			        for (let i=0; i<paths.length; i++)
				        content += '<option value="' + paths[i] + '">' + paths[i] + '</option>';
			        content += '</select>';
			
			        action = function () {
				        this.name = this.fromStep.editor.popupContent.querySelector('.returnPath').value;
				        this.warnDuplicate = false;
				
				        for (let i=0; i<this.fromStep.returnPaths.length; i++) {
					        let existing = this.fromStep.returnPaths[i];
					        if (existing !== this && existing.name === this.name)
						        existing.warnDuplicate = this.warnDuplicate = true;
				        }
				
				        this.fromStep.editor.draw();
			        }.bind(this);
		        }
		
		        this.fromStep.editor.workspace.showPopup(content, action);
	        }.bind(this);
	
	        let dragHandle = new Region(
		        function (ctx) {
                    ctx.save();

                    if (this.toStep == null && !this.dragging) {
                        this.endConnectorTranform.apply(ctx);
                        let radius = 8;
                        ctx.arc(0, 0, radius, 0, Math.PI * 2);
                    }
                    else {
                        this.midArrowTransform.apply(ctx);
			            let halfWidth = 8, arrowLength = 20;
			            ctx.rect(-arrowLength - 1, -halfWidth - 1, arrowLength + 2, halfWidth * 2 + 2);
			        }

			        ctx.restore();
		        }.bind(this),
                function (ctx) {
                    ctx.save();

                    if (this.toStep == null && !this.dragging) {
                        this.endConnectorTranform.apply(ctx);
                        this.drawUnconnectedHandle(ctx);
                    }
                    else {
                        this.midArrowTransform.apply(ctx);
                        this.drawConnectedHandle(ctx);
                    }
                    ctx.restore();
                }.bind(this),
		        'move'
	        );
	
	        dragHandle.hover = function () { return true; };
	        dragHandle.unhover = function () { return true; };
	        dragHandle.mousedown = this.dragStart.bind(this);
	        dragHandle.mouseup = this.dragStop.bind(this);
	        dragHandle.move = this.dragMove.bind(this);
	        this.regions = [pathName, dragHandle];
        }
	    private getNameToWrite() {
		    return this.name !== null ? this.name : this.onlyPath ? null : 'default';
	    }
	    private drawName(ctx) {
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
        private drawUnconnectedHandle(ctx) {
            let radius = 8;

            ctx.beginPath();
            ctx.fillStyle = '#f00';
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
	        ctx.fill();
        }
        private drawConnectedHandle(ctx) {
            let halfWidth = 8, arrowLength = 20;
	
	        ctx.shadowOffsetX = 0; 
	        ctx.shadowOffsetY = 0; 
	        ctx.fillStyle = '#fff';
	
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
        }
        draw(ctx) {
            let fromX = this.fromStep.x, fromY = this.fromStep.y;
            let toX: number, toY: number;
            if (this.toStep == null) {
                toX = this.fromStep.x + this.endOffsetX;
                toY = this.fromStep.y + this.endOffsetY;
            }
            else {
                toX = this.toStep.x;
                toY = this.toStep.y;
            }

	        ctx.strokeStyle = '#000';
	        ctx.lineWidth = 3;
	
	        let scale = function (input, min, max) {
		        if (input <= min)
			        return 0;
		        if (input >= max)
			        return 1;
		        return (input - min) / (max - min);
	        };
	
	        let dx = toX - fromX, dy = toY - fromY, m = dx === 0 ? 1 : Math.abs(dy/dx);
	        let xOffset = -175 * scale(-Math.abs(dx), -100, -40) * scale(-dy, -50, -20);
	        let yOffset = dy < 0 ? 300 : 300 * scale(-m, -5, -0.62);
	
	        let cp1x = fromX + xOffset, cp2x = toX + xOffset;
	        let cp1y = fromY + yOffset, cp2y = toY - yOffset;
	
	        this.fromStep.editor.drawCurve(ctx, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);
	
	        ctx.save();


            let tx: number, ty: number, angle: number;
            if (this.toStep == null && !this.dragging) {
                // handle goes at the end of the line
                tx = toX;
                ty = toY;
                angle = Math.atan2((toY - fromY), (toX - fromX));
                this.endConnectorTranform = new Transform(tx, ty, angle);
            }

            // handle goes at the middle of the line
            let mid1x = (fromX + cp1x + cp1x + cp2x) / 4, mid1y = (fromY + cp1y + cp1y + cp2y) / 4;
            let mid2x = (toX + cp2x + cp2x + cp1x) / 4, mid2y = (toY + cp2y + cp2y + cp1y) / 4;
            angle = Math.atan2((mid2y - mid1y), (mid2x - mid1x));
            tx = (mid1x + mid2x) / 2;
            ty = (mid1y + mid2y) / 2;
            this.midArrowTransform = new Transform(tx, ty, angle);
        }
        private dragStart(x, y) {
            this.toStep = null;
            this.updateOffset(x, y);
            this.dragging = true;
            return true;
        }
        private dragStop(x, y) {
		    if (!this.dragging)
			    return false;

            this.updateOffset(x, y);
		    this.dragging = false;
            this.toStep = this.fromStep.editor.getStep(x, y);
            // TODO: if other return paths from this step already go to the same destination, combine them into one somehow
		    return true;
        }
        private dragMove(x, y) {
		    if (!this.dragging)
			    return false;
		
		    this.updateOffset(x, y);
		    return true;
        }
        private updateOffset(x, y) {
            this.endOffsetX = x - this.fromStep.x;
            this.endOffsetY = y - this.fromStep.y;
        }
    }
}