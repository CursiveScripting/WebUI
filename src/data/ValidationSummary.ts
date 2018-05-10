import { Dictionary } from './Dictionary';
import { ValidationError } from './ValidationError';
import { UserProcess } from './UserProcess';

export class ValidationSummary {
    private readonly errorsByProcess: Dictionary<ValidationError[]>;

    constructor() {
        this.errorsByProcess = new Dictionary();
    }

    getErrors(process: UserProcess) {
        return this.errorsByProcess.getByName(process.name);
    }

    addError(process: UserProcess, error: ValidationError) {
        var errorList = this.errorsByProcess.getByName(process.name);
        if (errorList === null) {
            this.errorsByProcess.add(process.name, [error]);
        }
        else {
            errorList.push(error);
        }
    }

    setProcessErrors(process: UserProcess, errors: ValidationError[]) {
        if (errors.length === 0) {
            this.errorsByProcess.remove(process.name);
        }
        else {
            this.errorsByProcess.add(process.name, errors);
        }
    }

    clear() {
        this.errorsByProcess.clear();
    }

    hasAnyErrors() {
        return this.errorsByProcess.count > 0;
    }

    hasErrorsForProcess(process: UserProcess) {
        return this.errorsByProcess.contains(process.name);
    }
}