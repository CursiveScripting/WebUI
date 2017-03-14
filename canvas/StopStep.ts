﻿namespace Cursive {
    export class StopStep extends Step {
        returnPath: string;
        constructor(uniqueID: number, parentProcess: UserProcess, returnPath: string, x: number, y: number) {
            super(uniqueID, null, parentProcess, x, y);
            this.returnPath = returnPath;
        }
        protected writeText(ctx: CanvasRenderingContext2D) {
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#a00';
            ctx.fillText("Stop", this.x, this.y - this.radius / 4);
        }
        protected defineRegion(ctx: CanvasRenderingContext2D, scale: number) {
            ctx.rect(this.x - this.radius * scale, this.y - this.radius * scale, this.radius * 2 * scale, this.radius * 2 * scale);
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
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillStyle = '#000';

            let displayName = this.returnPath == null ? '[no name]' : '"' + this.returnPath + '"';
            Drawing.underlineText(ctx, displayName, this.x, this.y + this.radius / 2, isMouseOver);
        }
        private pathNameRegionClick() {
            this.parentProcess.workspace.returnPathEditor.show(this);
        }
        createDanglingReturnPaths() { }
        protected getInputSource() { return this.parentProcess.outputs; }
        protected getOutputSource() { return null; }
    }
}