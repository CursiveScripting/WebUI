namespace Cursive {
    export class StartStep extends Step {
        readonly radius: number;
        constructor(uniqueID: number, parentProcess: UserProcess, x: number, y: number) {
            super(uniqueID, null, parentProcess, x, y);
            this.radius = 45;
        }
        protected writeText(ctx: CanvasRenderingContext2D) {
            ctx.fillStyle = '#0a0';
            ctx.fillText('Start', this.x - this.radius / 4, this.y);
        }
        protected defineRegion(ctx: CanvasRenderingContext2D, scale: number) {
            ctx.moveTo(this.x - this.radius * scale, this.y - this.radius * 0.75 * scale);
            ctx.lineTo(this.x + this.radius * scale, this.y);
            ctx.lineTo(this.x - this.radius * scale, this.y + this.radius * 0.75 * scale);
            ctx.closePath();
        }
        getEdgeDistance(angle: number) {
            return this.radius;
        }
        createDanglingReturnPaths() {
            let returnPath = new ReturnPath(this, null, null, 150, 0);
            returnPath.onlyPath = true;
            this.returnPaths.push(returnPath);
        }
        protected getInputSource() { return null; }
        protected getOutputSource() { return this.parentProcess.inputs; }
        protected bodyRegionMouseUp(x: number, y: number) {
            this.dragging = false;
            // DON'T call stepMouseUp, unlike regular Steps and StopSteps
            return true;
        }
    }
}