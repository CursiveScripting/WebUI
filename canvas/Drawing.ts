namespace Cursive {
    export class Drawing {
        static drawCurve(ctx: CanvasRenderingContext2D, startX: number, startY: number, cp1x: number, cp1y: number, cp2x: number, cp2y: number, endX: number, endY: number) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.stroke();
        }

        static underlineText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, drawLine: boolean) {
            ctx.fillText(text, x, y);

            if (drawLine) {
                let w = ctx.measureText(text).width;
                ctx.lineWidth = 1;
                ctx.beginPath();

                let startX: number;
                switch (ctx.textAlign) {
                    case 'center':
                        startX = x - w / 2; break;
                    case 'right':
                        startX = x - w; break;
                    default:
                        startX = x; break;
                }

                ctx.moveTo(startX, y + 1);
                ctx.lineTo(startX + w, y + 1);
                ctx.stroke();
            }
        }

        static writeTextBackground(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, blurColor: string) {
            ctx.save();

            ctx.shadowBlur = 14;
            ctx.shadowColor = ctx.fillStyle = blurColor;
            
            for (let i=0; i<12; i++) // strengthen the shadow
                ctx.fillText(text, x, y);

            ctx.restore();
        }
    }
}