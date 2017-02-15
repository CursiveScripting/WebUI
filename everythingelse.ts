namespace Cursive {
    export class Type
    {
        name: string;
        color: string;
        constructor(name, color) {
            this.name = name;
            this.color = color;
        }
    }

    export class Variable {
        name: string;
        type: Type;
        links: any[];
        constructor(name, type) {
            this.name = name;
            this.type = type;
            this.links = [];
        }
    }

    export class Transform {
        constructor(readonly x: number, readonly y: number, readonly angle: number) { }
        apply(ctx: CanvasRenderingContext2D) {
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
        }
    }
}