namespace Cursive {
    export class Variable {
        name: string;
        type: Type;
        links: Variable[];
        constructor(name, type) {
            this.name = name;
            this.type = type;
            this.links = [];
        }
    }
}