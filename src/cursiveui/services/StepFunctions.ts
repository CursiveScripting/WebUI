import { StepType, IStepWithOutputs, IStep, IStepWithInputs } from '../workspaceState/IStep';
import { IStopStep } from '../workspaceState/IStopStep';
import { IProcessStep } from '../workspaceState/IProcessStep';
import { IStartStep } from '../workspaceState/IStartStep';
import { IVariableDisplay } from '../ui/ProcessContent/IVariableDisplay';

export function usesInputs(step: IStep): step is IStepWithInputs {
    return step.stepType !== StepType.Start;
}

export function usesOutputs(step: IStep): step is IStepWithOutputs {
    return step.stepType !== StepType.Stop;
}

export function isStartStep(step: IStep): step is IStartStep {
    return step.stepType === StepType.Start;
}

export function isStopStep(step: IStep): step is IStopStep {
    return step.stepType === StepType.Stop;
}

export function isProcessStep(step: IStep): step is IProcessStep {
    return step.stepType === StepType.UserProcess || step.stepType === StepType.SystemProcess;
}

export function determineStepId(otherSteps: IStep[]) {
    let testId = 1;

    const matchId = (step: IStep) => step.uniqueId === testId.toString();

    while (otherSteps.find(matchId) !== undefined) {
        testId ++;
    }

    return testId.toString();
}

export function determineVariableName(typeName: string, otherVars: IVariableDisplay[]) {
    let testNum = 0;
    let testName = `new ${typeName}`;
    
    const matchName = (variable: IVariableDisplay) => variable.name === testName;

    while (otherVars.find(matchName) !== undefined) {
        testNum ++;
        testName = `new ${typeName} ${testNum}`;
    }
    
    return testName;
}
