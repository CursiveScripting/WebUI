import { StepType, IStepWithOutputs, IStep, IStepWithInputs } from '../state/IStep';
import { IStopStep } from '../state/IStopStep';
import { IProcessStep } from '../state/IProcessStep';
import { IStartStep } from '../state/IStartStep';
import { ICoord } from '../state/dimensions';
import { IParameter } from '../state/IParameter';
import { gridSize } from '../ui/ProcessContent/gridSize';
import { IVariable } from '../state/IVariable';
import { IStepParameter } from '../state/IStepParameter';

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

export function determineVariableName(typeName: string, otherVars: IVariable[]) {
    let testNum = 0;
    let testName = `new ${typeName}`;
    
    const matchName = (variable: IVariable) => variable.name === testName;

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

export function createEmptyStartStep(inputs: IParameter[]): IStartStep {
    return {
        uniqueId: determineStepId([]),
        stepType: StepType.Start,
        x: gridSize * 2,
        y: gridSize * 2,
        outputs: inputs.map(i => { return { ...i }; }),
        returnPaths: [{ name: null }],
    };
}

export function anyStepLinksTo(testStep: IStepWithInputs, allSteps: IStep[]) {
    return allSteps.find(s => usesOutputs(s) && s.returnPaths.find(p => p.connection === testStep) !== undefined) !== undefined;
}

export function mapParameters(
    parameters: IStepParameter[],
    match: (param: IStepParameter) => boolean,
    modify: (param: IStepParameter) => IStepParameter
) {
    let anyChanged = false;

    const modifiedParameters = parameters.map(param => {
        if (match(param)) {
            anyChanged = true;    
            return modify(param);
        }

        return param;
    });

    return anyChanged
        ? modifiedParameters
        : parameters;
}

export function mapStepParameters(
    step: IStep,
    matchParam: (param: IStepParameter) => boolean,
    modifyInput: (param: IStepParameter) => IStepParameter,
    modifyOutput: (param: IStepParameter) => IStepParameter = modifyInput
) {
    const modifiedStep = { ...step };
    let anyChange = false;

    if (usesInputs(modifiedStep)) {
        const inputs = mapParameters(modifiedStep.inputs, matchParam, modifyInput);

        if (inputs !== modifiedStep.inputs) {
            modifiedStep.inputs = inputs;
            anyChange = true;
        }
    }

    if (usesOutputs(modifiedStep)) {
        const outputs = mapParameters(modifiedStep.outputs, matchParam, modifyOutput);
        
        if (outputs !== modifiedStep.outputs) {
            modifiedStep.outputs = outputs;
            anyChange = true;
        }
    }

    return anyChange
        ? modifiedStep
        : step;
}