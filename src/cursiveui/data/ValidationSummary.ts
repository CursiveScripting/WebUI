import { ValidationError } from './ValidationError';
import { IUserProcess } from '../workspaceState/IUserProcess';

export class ValidationSummary {
    private readonly errorsByProcess = new Map<string, ValidationError[]>();

    addError(process: IUserProcess, error: ValidationError) {
        var errorList = this.errorsByProcess.get(process.name)!;
        if (errorList === undefined) {
            this.errorsByProcess.set(process.name, [error]);
        }
        else {
            errorList.push(error);
        }
    }

    setProcessErrors(process: IUserProcess, errors: ValidationError[]) {
        if (errors.length === 0) {
            this.errorsByProcess.delete(process.name);
        }
        else {
            this.errorsByProcess.set(process.name, errors);
        }
    }

    clear() {
        this.errorsByProcess.clear();
    }

    get numErrorProcesses() {
        return this.errorsByProcess.size;
    }

    get hasAnyErrors() {
        return this.errorsByProcess.size > 0;
    }

    getErrorsForProcess(process: IUserProcess) {
        let errors = this.errorsByProcess.get(process.name);
        return errors === undefined ? [] : errors;
    }

    get errorProcessNames() {
        return Array.from(this.errorsByProcess.keys());
    }
}