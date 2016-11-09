namespace Cursive {
    export class ReturnPath {
        private readonly fromStep: Step;
        readonly toStep: Step;
        readonly name: string;
        warnDuplicate: boolean;
        onlyPath: boolean;
        private nameLength: number;

        readonly regions: Region[];
        private arrowTransform: Transform;

        constructor(fromStep, toStep, name) {
	        this.fromStep = fromStep;
	        this.toStep = toStep;
	        this.name = name;
	        this.warnDuplicate = false;
	        this.onlyPath = false;
	        this.nameLength = 30;
	
	        let pathName = new Region(
		        function (ctx) {
			        if (this.getNameToWrite() === null)
				        return;
			
			        ctx.save();
			
			        let transform = this.arrowTransform;
			        ctx.translate(transform.x, transform.y);
			        ctx.rotate(transform.angle);
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
	
	        let arrowHead = new Region(
		        function (ctx) {
			        ctx.save();			
			        this.arrowTransform.apply(ctx);
			
			        let halfWidth = 8, arrowLength = 20;
			        ctx.rect(-arrowLength - 1, -halfWidth - 1, arrowLength + 2, halfWidth * 2 + 2);
			
			        ctx.restore();
		        }.bind(this),
		        null, // drawn as part of the line
		        'move'
	        );
	
	        arrowHead.hover = function () { return true; };
	        arrowHead.unhover = function () { return true; };
	        arrowHead.mousedown = function (x, y) {
		        // first, disconnect this return path - it must be dragged somewhere to avoid deleting it
		        let paths = this.fromStep.returnPaths;
		        for (let i=0; i<paths.length; i++)
			        if (paths[i] === this) {
				        paths.splice(i, 1);
				        break;
			        }

		        return this.fromStep.startDragPath.call(this.fromStep);
	        }.bind(this);
	        arrowHead.mouseup = this.fromStep.stopDragPath.bind(this.fromStep);
	        arrowHead.move = this.fromStep.moveDragPath.bind(this.fromStep);
	        this.regions = [pathName, arrowHead];
        }
	    draw(ctx) {
		    this.arrowTransform = ReturnPath.drawPath(this.fromStep.editor, ctx, this.fromStep.x, this.fromStep.y, this.toStep.x, this.toStep.y);
	    }
	    getNameToWrite() {
		    return this.name !== null ? this.name : this.onlyPath ? null : 'default';
	    }
	    drawName(ctx) {
		    let writeName = this.getNameToWrite();
		    if (writeName === null)
			    return;
		
		    ctx.save();
            let transform = this.arrowTransform;
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
			    ctx.shadowColor = this.warnDuplicate ? '#f99' : '#fff';
			
			    ctx.fillStyle = '#000';
			    ctx.font = '16px sans-serif';
			    ctx.textBaseline = 'middle';
			
			    this.nameLength = ctx.measureText(writeName).width;
			    for (let i=0; i<12; i++) // strengthen the shadow
				    ctx.fillText(writeName, 0, 0);
		    }
		
		    ctx.restore();
	    }
        static drawPath(editor, ctx, fromX, fromY, toX, toY) {
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
	
	
	        editor.drawCurve(ctx, fromX, fromY, cp1x, cp1y, cp2x, cp2y, toX, toY);
	
	        let mid1x = (fromX + cp1x + cp1x + cp2x) / 4, mid1y = (fromY + cp1y + cp1y + cp2y) / 4;
	        let mid2x = (toX + cp2x + cp2x + cp1x) / 4, mid2y = (toY + cp2y + cp2y + cp1y) / 4;
	        let angle = Math.atan2((mid2y - mid1y), (mid2x - mid1x));
	        let midX = (mid1x + mid2x) / 2;
	        let midY = (mid1y + mid2y) / 2;
	
	        let halfWidth = 8, arrowLength = 20;
	
	        ctx.save();
	
	        let transform = new Transform(midX, midY, angle);
            transform.apply(ctx);
	
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

	        ctx.restore();
	        return transform;
        }
    }
}