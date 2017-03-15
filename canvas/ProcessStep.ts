namespace Cursive {
    export class ProcessStep extends Step {
        readonly radius: number;
        readonly extraLength: number;

        constructor(uniqueID: number, process: Process, parentProcess: UserProcess, x: number, y: number) {
            super(uniqueID, process, parentProcess, x, y);
            this.radius = 25;

            let ctx = parentProcess.workspace.processEditor.getContext();
            this.setFont(ctx);
            let textLength = ctx.measureText(this.process.name).width / 2 + 8;
            this.extraLength = Math.max(0, textLength - this.radius);
        }
        protected writeText(ctx: CanvasRenderingContext2D) {
            ctx.fillStyle = '#000';
            ctx.fillText(this.process.name, this.x, this.y);
        }
        protected drawBody(ctx: CanvasRenderingContext2D) {
            super.drawBody(ctx);
            
            if (this.process.isEditable) {
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                this.defineRegion(ctx, 0.85);
                ctx.stroke();
            }
        }
        protected defineRegion(ctx: CanvasRenderingContext2D, scale: number) {
            let radius = this.radius * scale;
            let length = this.extraLength;// * scale;

            ctx.beginPath();
            ctx.moveTo(this.x - length, this.y - radius);
            ctx.lineTo(this.x + length, this.y - radius);
            ctx.arcTo(this.x + length + radius, this.y - radius, this.x + length + radius, this.y, radius);
            ctx.arcTo(this.x + length + radius, this.y + radius, this.x + length, this.y + radius, radius);
            ctx.lineTo(this.x - length, this.y + radius);
            ctx.arcTo(this.x - length - radius, this.y + radius, this.x - length - radius, this.y, radius);
            ctx.arcTo(this.x - length - radius, this.y - radius, this.x - length, this.y - radius, radius);
            ctx.closePath();
        }
        getEdgeDistance(angle: number) {
            let cornerAngle = this.extraLength == 0 ? Math.PI / 2 : Math.tan(this.radius / this.extraLength);

            if (angle > Math.PI)
                angle -= Math.PI;
            if (angle > Math.PI / 2)
                angle = Math.PI - angle;
            
            if (angle == 0)
                return this.extraLength + this.radius;
            if (angle > cornerAngle)
                return this.extraLength / Math.cos(angle);

            let sine = Math.sin(angle);
            return this.extraLength * Math.cos(angle) + Math.sqrt(this.radius * this.radius - this.extraLength * this.extraLength * sine * sine);
        }
        protected getInputSource() {
            return this.process.inputs;
        }
        protected getOutputSource() {
            return this.process.outputs;
        }
        createDanglingReturnPaths() {
            let distance = 150;
            if (this.process.returnPaths.length == 0) {
                let returnPath = new ReturnPath(this, null, null, 0, distance);
                returnPath.onlyPath = true;
                this.returnPaths.push(returnPath);
            }
            else {
                let centerAngle = 7 * Math.PI / 16;
                let targetSeparation = 3 * Math.PI / 16;
                let maxSpread = 5 * Math.PI / 8;
                let numSteps = this.process.returnPaths.length - 1;
                let totalSpread = Math.min(maxSpread, numSteps * targetSeparation);

                let currentAngle = centerAngle - totalSpread / 2;
                let angularIncrement = totalSpread / numSteps;

                for (let path of this.process.returnPaths) {
                    let xOffset = distance * Math.cos(currentAngle);
                    let yOffset = distance * Math.sin(currentAngle);
                    currentAngle += angularIncrement;

                    let returnPath = new ReturnPath(this, null, path, xOffset, yOffset);
                    this.returnPaths.push(returnPath);
                }
            }
        }
    }
}