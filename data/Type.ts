namespace Cursive {
    export class Type
    {
        readonly name: string;
        color: string;
        readonly extendsType: Type;
        private readonly validation?: RegExp;
        readonly guidance?: string;
        readonly allowInput: boolean;
        constructor(name: string, color: string, extendsType: Type, validation: RegExp, guidance: string) {
            this.name = name;
            this.extendsType = extendsType;
            this.color = color;
            this.allowInput = validation !== null;
            this.validation = validation;
            this.guidance = guidance;
        }
        isValid(value: string) {
            if (this.validation === null)
                return false;
            return this.validation.test(value);
        }
        isAssignableFrom(other: Type) {
            let test: Type = this;

            do { 
                if (test == other)
                    return true;
                
                test = test.extendsType;
            } while (test != null);

            return false;
        }
    }
}