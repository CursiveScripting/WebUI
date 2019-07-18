import { IUserProcess } from '../state/IUserProcess';
import { IProcess } from '../state/IProcess';
import { isProcessStep } from './StepFunctions';

export function isUserProcess(process: IProcess): process is IUserProcess {
    return !process.isSystem;
}

export function hasEditableSignature(process: IProcess): process is IUserProcess {
    return isUserProcess(process) && !process.fixedSignature;
}

export function isProcessUsedAnywhere(process: IUserProcess, allProcesses: IProcess[]) {
    for (const otherProcess of allProcesses) {
        if (otherProcess !== process && isUserProcess(otherProcess)) {
            for (const step of otherProcess.steps) {
                if (isProcessStep(step) && step.processName === process.name) {
                    return true;
                }
            }
        }
    }

    return false;
}
