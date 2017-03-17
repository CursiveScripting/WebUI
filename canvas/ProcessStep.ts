namespace Cursive {
    export class ProcessStep extends Step {
        readonly radius: number;
        readonly extraLength: number;

        constructor(uniqueID: number, process: Process, isUserProcess: boolean, parentProcess: UserProcess, x: number, y: number) {
            super(uniqueID, process, parentProcess, x, y);
            this.radius = 25;

            let ctx = parentProcess.workspace.processEditor.getContext();
            this.setFont(ctx);
            let textLength = ctx.measureText(this.process.name).width / 2 + 8;
            this.extraLength = Math.max(0, textLength - this.radius);

            if (isUserProcess)
                this.bodyRegion.doubleClick = this.doubleClicked.bind(this);
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
        getPerpendicular(angle: number) {
            let cornerAngle = this.extraLength == 0 ? Math.PI / 2 : Math.atan(this.radius / this.extraLength);

            let sin = Math.sin(angle);
            let cos = Math.cos(angle);
            
            let calcAngle = Math.abs(angle);
            if (calcAngle > Math.PI)
                calcAngle -= Math.PI;
            if (calcAngle > Math.PI / 2)
                calcAngle = Math.PI - calcAngle;         

            let dist: number;
            let facingAngle: number;   

            if (calcAngle > cornerAngle) {
                dist = this.radius / Math.sin(calcAngle);

                // on straight edge, so face straight up/down
                if (angle < Math.PI)
                    facingAngle = Math.PI / 2;
                else
                    facingAngle = 3 * Math.PI / 2;
            }
            else {
                let calcSin = Math.sin(calcAngle);
                let sqrt = Math.sqrt(this.radius * this.radius - this.extraLength * this.extraLength * calcSin * calcSin);
                dist = this.extraLength * Math.cos(calcAngle) + sqrt;

                // facing angle should be perpendicular to circle's edge, rather than just the given angle
                let leftward = angle > Math.PI / 2 && angle < 3 * Math.PI / 2;
                let cy = sin * dist;
                if (leftward) {
                    let cx = cos * dist + this.extraLength;
                    facingAngle = Math.PI + Math.atan(cy / cx);
                }
                else {
                    let cx = cos * dist - this.extraLength;
                    facingAngle = Math.atan(cy / cx);
                }
            }

            let x = this.x + dist * cos;
            let y = this.y + dist * sin;
            return new Orientation(x, y, facingAngle);
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
        handleProcessSignatureChanges() {
            super.handleProcessSignatureChanges();

            // check all required return paths exist, add them if necessary
            let oldPaths = this.returnPaths.slice();
            let createDistance = 150;
            let angularIncrement = Math.PI / 8;
            let createAngle = Math.PI / 4;

            for (let path of this.process.returnPaths) {
                let foundMatch = false;
                for (let i=0; i<oldPaths.length; i++) {
                    let oldPath = oldPaths[i];
                    if (oldPath.name == path) {
                        foundMatch = true;
                        oldPaths.splice(i, 1);
                        break;
                    }
                }

                if (foundMatch)
                    continue;

                // create a new return path
                let xOffset = createDistance * Math.cos(createAngle);
                let yOffset = createDistance * Math.sin(createAngle);
                createAngle += angularIncrement;

                let returnPath = new ReturnPath(this, null, path, xOffset, yOffset);
                this.returnPaths.push(returnPath);
            }
            // account for a single no-name path
            if (this.process.returnPaths.length == 0) {
                let foundMatch = false;
                for (let i=0; i<oldPaths.length; i++) {
                    let oldPath = oldPaths[i];
                    if (oldPath.name === null) {
                        foundMatch = true;
                        oldPaths.splice(i, 1);
                        break;
                    }
                }

                if (!foundMatch) {
                    // create a new return path
                    let xOffset = createDistance * Math.cos(createAngle);
                    let yOffset = createDistance * Math.sin(createAngle);

                    let returnPath = new ReturnPath(this, null, null, xOffset, yOffset);
                    this.returnPaths.push(returnPath);
                }
            }
    
            // remove return paths that are now invalid
            for (let oldPath of oldPaths) {
                let pos = this.returnPaths.indexOf(oldPath);
                if (pos != -1)
                    this.returnPaths.splice(pos, 1);
            }
        }
        private doubleClicked() {
            this.parentProcess.workspace.openProcess(this.process as UserProcess);
            return false;
        }
    }
}