import { IUserProcess } from '../workspaceState/IUserProcess';
import { IProcess } from '../workspaceState/IProcess';
import { StepType, IStepWithOutputs, IStep, IStepWithInputs } from '../workspaceState/IStep';
import { IStopStep } from '../workspaceState/IStopStep';
import { IProcessStep } from '../workspaceState/IProcessStep';

export function isUserProcess(process: IProcess): process is IUserProcess {
    return !process.isSystem;
}

export function hasEditableSignature(process: IProcess): process is IUserProcess {
    return isUserProcess(process) && !process.fixedSignature;
}

export function usesInputs(step: IStep): step is IStepWithInputs {
    return step.stepType !== StepType.Start;
}

export function usesOutputs(step: IStep): step is IStepWithOutputs {
    return step.stepType !== StepType.Stop;
}

export function isStopStep(step: IStep): step is IStopStep {
    return step.stepType === StepType.Stop;
}

export function isProcessStep(step: IStep): step is IProcessStep {
    return step.stepType === StepType.UserProcess || step.stepType === StepType.SystemProcess;
}