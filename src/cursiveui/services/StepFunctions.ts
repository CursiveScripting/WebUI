import { StepType, IStepWithOutputs, IStep, IStepWithInputs } from '../state/IStep';
import { IStopStep } from '../state/IStopStep';
import { IProcessStep } from '../state/IProcessStep';
import { IStartStep } from '../state/IStartStep';
import { ICoord } from '../state/dimensions';
import { IParameter } from '../state/IParameter';
import { gridSize } from '../ui/ProcessContent/gridSize';
import { IVariable } from '../state/IVariable';
import { IStepParameter } from '../state/IStepParameter';
import { IUserProcess } from '../state/IUserProcess';

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

function mapParameters(
    parameters: IStepParameter[],
    match: (param: IStepParameter) => boolean,
    modify: (param: IStepParameter) => IStepParameter,
    paramMap: Map<IStepParameter, IStepParameter>
) {
    let anyChanged = false;

    const modifiedParameters = parameters.map(param => {
        if (match(param)) {
            anyChanged = true;
            const modified = modify(param);
            paramMap.set(param, modified);
            return modified;
        }

        return param;
    });

    return anyChanged
        ? modifiedParameters
        : parameters;
}

function mapStepParameters(
    step: IStep,
    matchParam: (param: IStepParameter) => boolean,
    modifyInput: (param: IStepParameter) => IStepParameter,
    modifyOutput: (param: IStepParameter) => IStepParameter,
    paramMap: Map<IStepParameter, IStepParameter>
) {
    const modifiedStep = { ...step };
    let anyChange = false;

    if (usesInputs(modifiedStep)) {
        const inputs = mapParameters(modifiedStep.inputs, matchParam, modifyInput, paramMap);

        if (inputs !== modifiedStep.inputs) {
            modifiedStep.inputs = inputs;
            anyChange = true;
        }
    }

    if (usesOutputs(modifiedStep)) {
        const outputs = mapParameters(modifiedStep.outputs, matchParam, modifyOutput, paramMap);
        
        if (outputs !== modifiedStep.outputs) {
            modifiedStep.outputs = outputs;
            anyChange = true;
        }
    }

    return anyChange
        ? modifiedStep
        : step;
}

export function replaceVariableReferences(
    process: IUserProcess,
    matchVariable: IVariable,
    stepInputReplacement: IVariable | undefined,
    stepOutputReplacement: IVariable | undefined
): IUserProcess {
    const paramMap = new Map<IStepParameter, IStepParameter>();

    const matchParam = (param: IStepParameter) => param.connection === matchVariable;

    const modifyInput = (param: IStepParameter) => { return {
        ...param,
        connection: stepInputReplacement,
    }};

    const modifyOutput = (param: IStepParameter) => { return {
        ...param,
        connection: stepOutputReplacement,
    }};

    // If steps have been recreated due to their parameters changing, ensure return path references are also updated.
    let steps = process.steps.map(step => mapStepParameters(step, matchParam, modifyInput, modifyOutput, paramMap));

    for (let i = 0; i<steps.length; i++) {
        const oldStep = process.steps[i];
        const newStep = steps[i];

        if (newStep !== oldStep) {
            steps = replaceStep(steps, oldStep, newStep);
        }
    }

    // Because variables store references to step parameters, if the parameters are updated, the variables' references also need to be updated.
    // Unless we update all the parameters again, we can't update the variables themselves, as the parameters would be referencing old versions again.
    const variables = process.variables.map(variable => {
        variable.incomingLinks = variable.incomingLinks.map(param => {
            const match = paramMap.get(param);

            return match === undefined
                ? param
                : match;
        });

        variable.outgoingLinks = variable.outgoingLinks.map(param => {
            const match = paramMap.get(param);

            return match === undefined
                ? param
                : match;
        });

        return variable;
    });

    return {
        ...process,
        steps,
        variables,
    };
}

export function replaceStep(
    processSteps: IStep[],
    oldStep: IStep,
    newStep: IStep
): IStep[] {
    if (!usesInputs(newStep)) {
        return processSteps.map(step => step === oldStep
                ? newStep
                : step
        )
    }
    
    return processSteps.map(step => {
        if (step === oldStep) {
            step = newStep;
        }

        if (usesOutputs(step)) {
            // no need to redefine steps or parameters here, as this change won't affect rendering
            for (const path of step.returnPaths) {
                if (path.connection === oldStep) {
                    path.connection = newStep;
                }
            }
        }

        return step;
    });
}