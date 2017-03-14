namespace Cursive {
    export abstract class DataField {
        initialValue: string;
        constructor(public name: string, public type: Type) {
            this.initialValue = null;
        }
    }

    export class Parameter extends DataField {
        link: Variable;
        constructor(name: string, dataType: Type) {
            super(name, dataType);
            this.link = null;
        }
    }

    export class Variable extends DataField {
        links: Parameter[];
        constructor(name: string, dataType: Type) {
            super(name, dataType);
            this.links = [];
        }
    }

    export class Position
    {
        constructor(public x: number, public y: number) { }
    }
}