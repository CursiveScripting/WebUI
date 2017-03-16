namespace Cursive {
    export class StopStep extends Step {
        readonly radius: number;
        constructor(uniqueID: number, parentProcess: UserProcess, public returnPath: string, x: number, y: number) {
            super(uniqueID, null, parentProcess, x, y);
            this.radius = 45;
        }
        protected writeText(ctx: CanvasRenderingContext2D) {
            ctx.fillStyle = '#a00';
            ctx.fillText('Stop', this.x, this.y - this.radius / 4);
        }
        protected defineRegion(ctx: CanvasRenderingContext2D, scale: number) {
            ctx.rect(this.x - this.radius * scale, this.y - this.radius * scale, this.radius * 2 * scale, this.radius * 2 * scale);
        }
        getPerpendicular(angle: number) {
            let sin = Math.sin(angle);
            let cos = Math.cos(angle);
            let absCos = Math.abs(cos);
            let absSin = Math.abs(sin);
            let dist: number;
            if (this.radius * absSin <= this.radius * absCos)
                dist = this.radius / absCos;
            else
                dist = this.radius / absSin;

            let x = this.x + dist * cos;
            let y = this.y + dist * sin;
            let facingAngle: number;

            let halfPi = Math.PI / 2;
            let quarterPi = Math.PI / 4;
            if (angle < quarterPi)
                facingAngle = 0;
            else if (angle < 3 * quarterPi)
                facingAngle = halfPi;
            else if (angle < 5 * quarterPi)
                facingAngle = Math.PI;
            else if (angle < 7 * quarterPi)
                facingAngle = Math.PI + halfPi;
            else
                facingAngle = 0;

            return new Orientation(x, y, facingAngle);
        }
        protected createRegions() {
            super.createRegions();

            let pathName = new Region(
                this.definePathNameRegion.bind(this),
                this.drawPathNameRegion.bind(this),
                this.parentProcess.returnPaths.length > 0 ? 'pointer' : 'not-allowed' // TODO: this needs to update when the condition does
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
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.strokeStyle = ctx.fillStyle = '#000';

            let displayName = this.returnPath === null ? '[no name]' : '"' + this.returnPath + '"';
            let underline = isMouseOver && this.parentProcess.returnPaths.length > 0;
            Drawing.underlineText(ctx, displayName, this.x, this.y + this.radius / 2, underline);
        }
        private pathNameRegionClick() {
            if (this.parentProcess.returnPaths.length > 0)
                this.parentProcess.workspace.returnPathEditor.show(this);
        }
        protected getInputSource() { return this.parentProcess.outputs; }
        protected getOutputSource() { return null; }
        handleProcessSignatureChanges() {
            super.handleProcessSignatureChanges();
            
            // if this step has a named return path not present on its parent process, clear it
            if (this.returnPath !== null && this.parentProcess.returnPaths.indexOf(this.returnPath) == -1)
                this.returnPath = null;
        }
    }
}