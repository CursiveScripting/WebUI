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

    export abstract class Process {
        constructor(readonly name: string, readonly inputs: Variable[], readonly outputs: Variable[], readonly returnPaths: string[]) { }
    }

    export class SystemProcess extends Process {
        constructor(name, inputs, outputs, returnPaths) {
            super(name, inputs, outputs, returnPaths);
        }
    }

    export class UserProcess extends Process {
        fixedSignature: boolean;
        steps: Step[];
        variables: Variable[];
        constructor(name, inputs, outputs, returnPaths, fixedSignature) {
            super(name, inputs, outputs, returnPaths);
	    
	        this.fixedSignature = fixedSignature;
	        this.steps = [];
	        this.variables = [];
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