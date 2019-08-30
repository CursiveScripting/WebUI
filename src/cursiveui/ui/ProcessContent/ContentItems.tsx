import * as React from 'react';
import { useEffect, useContext } from 'react';
import { StepDisplay } from './StepDisplay';
import { StepType, IStep } from '../../state/IStep';
import { WorkspaceDispatchContext } from '../../reducer';
import { DragInfo, DragType } from './ProcessContent';
import { VariableDisplay } from './VariableDisplay';
import { determineVariableName, isStartStep, isStopStep, isProcessStep, usesInputs, usesOutputs } from '../../services/StepFunctions';
import { ICoord } from '../../state/dimensions';
import { IVariable } from '../../state/IVariable';
import { IStepParameter } from '../../state/IStepParameter';
import { IReturnPath } from '../../state/IReturnPath';
import { IValidationError } from '../../state/IValidationError';

interface Props {
    steps: IStep[];
    variables: IVariable[];
    errors: IValidationError[];
    stepRefs: Map<string, StepDisplay>;
    varRefs: Map<string, VariableDisplay>;

    minScreenX: number;
    minScreenY: number;

    dragging?: DragInfo;
    setDragging: (dragging: DragInfo | undefined) => void;

    processName: string;

    focusError?: IValidationError;
}

export const ContentItems = (props: Props) => {
    const context = useContext(WorkspaceDispatchContext);

    useEffect(() => {
        if (props.focusError !== undefined) {
            props.stepRefs.get(props.focusError.step.uniqueId)!.scrollIntoView();
        }
    }, [props.focusError, props.stepRefs, props.varRefs])

    const startDragStepHeader = (step: IStep, x: number, y: number, displayX: number, displayY: number) => props.setDragging({
        type: DragType.Step,
        step,
        x: displayX,
        y: displayY,
        xOffset: x - displayX - props.minScreenX,
        yOffset: y - displayY - props.minScreenY,
    });

    const startDragInConnector = (step: IStep, x: number, y: number) => props.setDragging({
        type: DragType.StepInConnector,
        step,
        x: x - props.minScreenX,
        y: y - props.minScreenY,
    });

    const startDragReturnPath = (step: IStep, path: string | null, x: number, y: number) => props.setDragging({
        type: DragType.ReturnPath,
        step,
        returnPath: path,
        x: x - props.minScreenX,
        y: y - props.minScreenY,
    });

    const startDragParameter = (step: IStep, param: IStepParameter, input: boolean, x: number, y: number) => props.setDragging({
        type: DragType.StepParameter,
        step,
        param,
        input,
        x: x - props.minScreenX,
        y: y - props.minScreenY,
    });

    const stopDragParameter = (step: IStep, param: IStepParameter, input: boolean) => {
        if (props.dragging !== undefined) {
            if (props.dragging.type === DragType.StepParameter && props.dragging.input !== input) {
                // link both parameters with a variable
                const varType = props.dragging.param.type;

                context({
                    type: 'link via variable',
                    typeName: varType.name,
                    inProcessName: props.processName,
                    varName: determineVariableName(varType.name, props.variables),
                    x: (props.dragging.step.x + step.x) / 2,
                    y: (props.dragging.step.y + step.y) / 2,

                    fromStepId: step.uniqueId,
                    fromStepParamName: param.name,
                    fromStepInputParam: input,

                    toStepId: props.dragging.step.uniqueId,
                    toStepParamName: props.dragging.param.name,
                    toStepInputParam: props.dragging.input,
                });
            }
            else if (props.dragging.type === DragType.VarParameter && props.dragging.input !== input) {
                context({
                    type: 'link variable',
                    inProcessName: props.processName,
                    stepId: step.uniqueId,
                    stepParamName: param.name,
                    stepInputParam: input,
                    varName: props.dragging.variable.name,
                });
            }
        }

        props.setDragging(undefined);
    }

    const stopDragInConnector = (step: IStep) => {
        if (props.dragging !== undefined && props.dragging.type === DragType.ReturnPath) {
            context({
                type: 'set return path',
                inProcessName: props.processName,
                fromStepId: props.dragging.step.uniqueId,
                pathName: props.dragging.returnPath,
                toStepId: step.uniqueId,
            });
        }

        props.setDragging(undefined);
    };

    const stopDragReturnPath = (step: IStep, path: string | null) => {
        if (props.dragging !== undefined && props.dragging.type === DragType.StepInConnector) {
            context({
                type: 'set return path',
                inProcessName: props.processName,
                fromStepId: step.uniqueId,
                pathName: path,
                toStepId: props.dragging.step.uniqueId,
            });
        }

        props.setDragging(undefined);
    };

    const startDragVarHeader = (variable: IVariable, x: number, y: number, displayX: number, displayY: number) => props.setDragging({
        type: DragType.Variable,
        variable,
        x: displayX,
        y: displayY,
        xOffset: x - displayX - props.minScreenX,
        yOffset: y - displayY - props.minScreenY,
    });

    const startDragVarConnector = (variable: IVariable, input: boolean, x: number, y: number) => props.setDragging({
        type: DragType.VarParameter,
        variable,
        input,
        x: x - props.minScreenX,
        y: y - props.minScreenY,
    });

    const stopDragVarConnector = (variable: IVariable) => {
        let dropped = false;

        if (props.dragging !== undefined && props.dragging.type === DragType.StepParameter) {
            context({
                type: 'link variable',
                inProcessName: props.processName,
                stepId: props.dragging.step.uniqueId,
                stepParamName: props.dragging.param.name,
                stepInputParam: props.dragging.input,
                varName: variable.name,
            });

            dropped = true;
        }

        props.setDragging(undefined);
        return dropped;
    }

    props.stepRefs.clear();

    const focusStep = props.focusError === undefined
        ? undefined
        : props.focusError.step;

    const steps = props.steps.map(step => {
        const focusThisStep = step === focusStep;
        if (focusThisStep) {

        }
        
        const isValid = !props.errors.find(e => e.step === step);

        const stepPos: ICoord = props.dragging !== undefined
            && props.dragging.type === DragType.Step
            && props.dragging.step === step
                ? props.dragging
                : step;

        const [name, desc] = getNameAndDesc(step);

        let inputs: IStepParameter[];
        let outputs: IStepParameter[];

        let inputConnected: boolean;
        let returnPaths: IReturnPath[];

        if (usesInputs(step)) {
            inputs = step.inputs;
            inputConnected = step.inputConnected;
        }
        else {
            inputs = [];
            inputConnected = false;
        }

        if (usesOutputs(step)) {
            outputs = step.outputs;
            returnPaths = step.returnPaths;
        }
        else {
            outputs = [];
            returnPaths = [];
        }

        const returnPathName = isStopStep(step)
            ? step.returnPath !== null
                ? step.returnPath
                : undefined
            : undefined;

        return (
            <StepDisplay
                ref={s => { if (s !== null) { props.stepRefs.set(step.uniqueId, s); } else { props.stepRefs.delete(step.uniqueId); }}}
                key={step.uniqueId}
                name={name}
                description={desc}
                inputs={inputs}
                outputs={outputs}
                returnPaths={returnPaths}
                isValid={isValid}
                stepType={step.stepType}
                uniqueId={step.uniqueId}
                x={stepPos.x}
                y={stepPos.y}
                returnPathName={returnPathName}

                inProcessName={props.processName}
                inputConnected={inputConnected}
                focused={focusThisStep}
                focusParameter={focusThisStep ? props.focusError!.parameter : undefined}
                focusReturnPath={focusThisStep ? props.focusError!.returnPath : undefined}
                readonly={false}
                canDelete={step.stepType !== StepType.Start}
                headerMouseDown={(x, y, displayX, displayY) => startDragStepHeader(step, x, y, displayX, displayY)}
                inputLinkMouseDown={(x, y) => startDragInConnector(step, x, y)}
                inputLinkMouseUp={() => stopDragInConnector(step)}
                outputLinkMouseDown={(returnPath, x, y) => startDragReturnPath(step, returnPath, x, y)}
                outputLinkMouseUp={returnPath => stopDragReturnPath(step, returnPath)}
                parameterLinkMouseDown={(param, input, x, y) => startDragParameter(step, param, input, x, y)}
                parameterLinkMouseUp={(param, input) => stopDragParameter(step, param, input)}
            />
        )
    });
    
    props.varRefs.clear();

    const variables = props.variables.map(variable => {
        const varPos: ICoord = props.dragging !== undefined
            && props.dragging.type === DragType.Variable
            && props.dragging.variable === variable
                ? props.dragging
                : variable;

        return (
            <VariableDisplay
                ref={v => { if (v !== null) { props.varRefs.set(variable.name, v); } else { props.varRefs.delete(variable.name); }}}
                name={variable.name}
                initialValue={variable.initialValue}
                type={variable.type}
                x={varPos.x}
                y={varPos.y}
                inputConnected={variable.incomingLinks.length > 0}
                outputConnected={variable.outgoingLinks.length > 0}
                inProcessName={props.processName}
                key={variable.name}
                
                headerMouseDown={(x, y, displayX, displayY) => startDragVarHeader(variable, x, y, displayX, displayY)}
                connectorMouseDown={(input, x, y) => startDragVarConnector(variable, input, x, y)}
                connectorMouseUp={() => stopDragVarConnector(variable)}
            />
        );
    });

    return <>
        {steps}
        {variables}
    </>
}

function getNameAndDesc(step: IStep): [string, string | undefined] {
    if (isStartStep(step)) {
        return ['Start', undefined];
    }
    else if (isStopStep(step)) {
        return ['Stop', undefined];
    }
    else if (isProcessStep(step)) {
        return [step.process.name, step.process.description];
    }

    throw new Error(`Unrecognised step type: ${step.stepType}`);
}