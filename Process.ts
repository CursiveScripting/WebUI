namespace Cursive {
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
}