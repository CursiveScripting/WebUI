import { StepType, IStepWithOutputs, IStep, IStepWithInputs } from '../state/IStep';
import { IStopStep } from '../state/IStopStep';
import { IProcessStep } from '../state/IProcessStep';
import { IStartStep } from '../state/IStartStep';
import { IVariableDisplay } from '../ui/ProcessContent/IVariableDisplay';
import { ICoord } from '../data/dimensions';

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

export function getDescendentMidLeftPos(root: ICoord, element: HTMLDivElement): ICoord {
    return {
        x: root.x + element.offsetLeft,
        y: root.y + element.offsetTop + element.offsetHeight / 2,
    };
}

export function getDescendentMidRightPos(root: ICoord, element: HTMLDivElement): ICoord {
    return {
        x: root.x + element.offsetLeft + element.offsetWidth,
        y: root.y + element.offsetTop + element.offsetHeight / 2,
    };
}
