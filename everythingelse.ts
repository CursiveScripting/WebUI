namespace Cursive {
    export class Type
    {
        readonly name: string;
        color: string;
        readonly validation?: RegExp;
        readonly allowInput: boolean;
        constructor(name, color, validation) {
            this.name = name;
            this.color = color;
            this.allowInput = validation !== null;
            this.validation = validation;
        }
        isValid(value: string) {
            if (this.validation === null)
                return false;
            return this.validation.test(value);
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