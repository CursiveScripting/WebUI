namespace Cursive {
    export class Transform {
        constructor(readonly x: number, readonly y: number, readonly angle: number) { }
        apply(ctx: CanvasRenderingContext2D) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
        }
    }
}