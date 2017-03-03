namespace Cursive {
    export class StartStep extends Step {
        constructor(uniqueID: number, parentProcess: UserProcess, x: number, y: number) {
            super(uniqueID, null, parentProcess, x, y);
        }
        protected writeText(ctx) {
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#0a0';
            ctx.fillText("Start", this.x - this.radius / 4, this.y);
        }
        protected createBodyRegion() {
            return new Region(
                function (ctx) {
                    ctx.moveTo(this.x - this.radius, this.y - this.radius * 0.75);
                    ctx.lineTo(this.x + this.radius, this.y);
                    ctx.lineTo(this.x - this.radius, this.y + this.radius * 0.75);
                    ctx.closePath();
                }.bind(this),
                this.drawBody.bind(this),
                'move'
            )
        }
        protected createCollisionRegion() {
            return new Region( // twice the normal radius, so that another step can't overlap this one
                function (ctx) {
                    ctx.moveTo(this.x - this.radius * 2, this.y - this.radius * 1.5);
                    ctx.lineTo(this.x + this.radius * 2, this.y);
                    ctx.lineTo(this.x - this.radius * 2, this.y + this.radius * 1.5);
                    ctx.closePath();
                }.bind(this)
            )
        }
        createDanglingReturnPaths() {
            let returnPath = new ReturnPath(this, null, null, 150, 0);
            returnPath.onlyPath = true;
            this.returnPaths.push(returnPath);
        }
        getInputs() { return null; }
        getOutputs() { return this.parentProcess.inputs; }
    }
}