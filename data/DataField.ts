namespace Cursive {
    export abstract class DataField {
        name: string;
        type: Type;
        initialValue: string;
        constructor(name: string, dataType: Type) {
            this.name = name;
            this.type = dataType;
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
}