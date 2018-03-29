export class Type {
    readonly allowInput: boolean;

    constructor(
        readonly name: string,
        public color: string,
        readonly extendsType: Type | undefined,
        private readonly validation: RegExp | undefined,
        readonly guidance?: string
    ) {
        this.allowInput = validation !== undefined;
    }

    isValid(value: string) {
        if (this.validation === undefined) {
            return false;
        }
        return this.validation.test(value);
    }
    
    isAssignableFrom(other: Type) {
        let test: Type | undefined = this;

        do { 
            if (test === other) {
                return true;
            }
            
            test = test.extendsType;
        } while (test !== undefined);

        return false;
    }
}