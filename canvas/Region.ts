namespace Cursive {
    export class Region {
        hover: () => boolean;
        unhover: () => boolean;
        click: () => boolean;
        doubleClick: () => boolean;
        mousedown: (x: number, y: number) => boolean;
        mouseup: (x: number, y: number) => boolean;
        move: (x: number, y: number) => boolean;
        readonly define: (ctx: CanvasRenderingContext2D) => boolean;
        private readonly draw: (ctx: CanvasRenderingContext2D, hover: boolean, mouseDown: boolean) => void;
        readonly cursor: string;

        centerX: number;

        constructor(definition, draw?: (ctx: CanvasRenderingContext2D, hover: boolean, mouseDown: boolean) => void, cursor?: string) {
            let empty = function () { return false; }
            this.define = definition == null ? empty : definition;
            this.draw = draw == null ? empty : draw;
            this.click = this.hover = this.unhover = this.move = this.mousedown = this.mouseup = empty;
            this.doubleClick = null;
            this.cursor = cursor == null ? '' : cursor;
        }
        containsPoint(ctx: CanvasRenderingContext2D, x: number, y: number) {
            ctx.strokeStyle = 'rgba(0,0,0,0)';
            ctx.beginPath();
            this.define(ctx);
            ctx.stroke();
        
            return ctx.isPointInPath(x,y);
        }
        callDraw(ctx: CanvasRenderingContext2D, editor: EditorCanvas) {
            this.draw(ctx, editor.hoverRegion === this, editor.mouseDownRegion === this);
        }
    }
}