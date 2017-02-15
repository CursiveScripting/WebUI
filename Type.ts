namespace Cursive {
    export class Type
    {
        readonly name: string;
        color: string;
        private readonly validation?: RegExp;
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
}