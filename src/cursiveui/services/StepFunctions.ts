import { StepType, IStepWithOutputs, IStep, IStepWithInputs } from '../workspaceState/IStep';
import { IStopStep } from '../workspaceState/IStopStep';
import { IProcessStep } from '../workspaceState/IProcessStep';
import { IVariable } from '../workspaceState/IVariable';

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

export function determineStepId(otherSteps: IStep[]) {
    let testId = 1;

    while (otherSteps.find(s => s.uniqueId === testId.toString()) !== undefined) {
        testId ++;
    }

    return testId.toString();
}

export function determineVariableName(typeName: string, otherVars: IVariable[]) {
    let testNum = 0;
    let testName = `new ${typeName}`;

    while (otherVars.find(v => v.name === testName) !== undefined) {
        testNum ++;
        testName = `new ${typeName} ${testNum}`;
    }
    
    return testName;
}
