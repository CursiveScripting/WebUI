namespace Cursive {
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
}