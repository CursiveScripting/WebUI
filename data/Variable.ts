namespace Cursive {
    export class Variable {
        name: string;
        type: Type;
        links: any[]; // meant to be Variable[], but contains Connectors in several cases
        initialValue: string;
        constructor(name: string, dataType: Type) {
            this.name = name;
            this.type = dataType;
            this.links = [];
            this.initialValue = null;
        }
    }
}