namespace Cursive {
    export class StopStep extends Step {
        readonly radius: number;
        returnPath: string;
        constructor(uniqueID: number, parentProcess: UserProcess, returnPath: string, x: number, y: number) {
            super(uniqueID, null, parentProcess, x, y);
            this.returnPath = returnPath;
            this.radius = 45;
        }
        protected writeText(ctx: CanvasRenderingContext2D) {
            ctx.fillStyle = '#a00';
            ctx.fillText('Stop', this.x, this.y - this.radius / 4);
        }
        protected defineRegion(ctx: CanvasRenderingContext2D, scale: number) {
            ctx.rect(this.x - this.radius * scale, this.y - this.radius * scale, this.radius * 2 * scale, this.radius * 2 * scale);
        }
        getEdgeDistance(angle: number) {
            let abs_cos_angle = Math.abs(Math.cos(angle));
            let abs_sin_angle = Math.abs(Math.sin(angle));
            if (this.radius * abs_sin_angle <= this.radius * abs_cos_angle)
                return this.radius / abs_cos_angle;
            else
                return this.radius / abs_sin_angle;
        }
        protected createRegions() {
            super.createRegions();

            let pathName = new Region(
                this.definePathNameRegion.bind(this),
                this.drawPathNameRegion.bind(this),
                'pointer'
            );
            pathName.click = this.pathNameRegionClick.bind(this);
            pathName.hover = function () { return true; }
            pathName.unhover = function () { return true; }

            this.regions.unshift(pathName);
        }
        private definePathNameRegion(ctx: CanvasRenderingContext2D) {
            ctx.rect(this.x - this.radius, this.y + this.radius / 8, this.radius * 2, this.radius / 3)
        }
        private drawPathNameRegion(ctx: CanvasRenderingContext2D, isMouseOver: boolean, isMouseDown: boolean) {
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#000';

            let displayName = this.returnPath == null ? '[no name]' : '"' + this.returnPath + '"';
            Drawing.underlineText(ctx, displayName, this.x, this.y + this.radius / 2, isMouseOver);
        }
        private pathNameRegionClick() {
            this.parentProcess.workspace.returnPathEditor.show(this);
        }
        protected getInputSource() { return this.parentProcess.outputs; }
        protected getOutputSource() { return null; }
    }
}