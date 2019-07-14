import * as React from 'react';
import { useEffect } from 'react';
import { StepDisplay } from './StepDisplay';
import { StepType } from '../../workspaceState/IStep';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { IStepDisplay, IStepDisplayParam } from './IStepDisplay';
import { ICoord, DragInfo, DragType } from './ProcessContent';
import { VariableDisplay } from './VariableDisplay';
import { IVariableDisplay } from './IVariableDisplay';

interface Props {
    steps: IStepDisplay[];
    variables: IVariableDisplay[];
    stepRefs: Map<string, StepDisplay>;
    varRefs: Map<string, VariableDisplay>;

    dragging?: DragInfo;
    setDragging: (dragging: DragInfo | undefined) => void;

    processName: string;
    focusVariableName?: string;
    focusStepId?: string;
    focusParameter?: IStepDisplayParam;
    focusReturnPath?: string | null;
}

export const ContentItems = (props: Props) => {
    const context = React.useContext(WorkspaceDispatchContext);

    useEffect(() => {
        if (props.focusStepId !== undefined) {
            props.stepRefs.get(props.focusStepId)!.scrollIntoView();
        }

        if (props.focusVariableName !== undefined) {
            props.varRefs.get(props.focusVariableName)!.scrollIntoView();   
        }
    }, [props.focusStepId, props.focusVariableName, props.stepRefs, props.varRefs])

    const startDragStepHeader = (step: IStepDisplay, x: number, y: number) => props.setDragging({
        type: DragType.Step,
        step,
        x,
        y,
    });

    const startDragInConnector = (step: IStepDisplay, x: number, y: number) => props.setDragging({
        type: DragType.StepInConnector,
        step,
        x,
        y,
    });

    const startDragReturnPath = (step: IStepDisplay, path: string | null, x: number, y: number) => props.setDragging({
        type: DragType.ReturnPath,
        step,
        returnPath: path,
        x,
        y,
    });

    const startDragParameter = (step: IStepDisplay, param: IStepDisplayParam, input: boolean, x: number, y: number) => props.setDragging({
        type: DragType.StepParameter,
        step,
        param,
        input,
        x,
        y,
    });

    const stopDragParameter = (step: IStepDisplay, param: IStepDisplayParam, input: boolean) => {
        if (props.dragging !== undefined) {
            if (props.dragging.type === DragType.StepParameter && props.dragging.input !== input) {
                // TODO: link both parameters with a variable
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

    const stopDragInConnector = (step: IStepDisplay) => {
        if (props.dragging !== undefined && props.dragging.type === DragType.ReturnPath) {
            context({
                type: 'set return path',
                inProcessName: props.processName,
                fromStepId: step.uniqueId,
                pathName: props.dragging.returnPath,
                toStepId: props.dragging.step.uniqueId,
            });
        }

        props.setDragging(undefined);
    };

    const stopDragReturnPath = (step: IStepDisplay, path: string | null) => {
        if (props.dragging !== undefined && props.dragging.type === DragType.StepInConnector) {
            context({
                type: 'set return path',
                inProcessName: props.processName,
                fromStepId: props.dragging.step.uniqueId,
                pathName: path,
                toStepId: step.uniqueId,
            });
        }

        props.setDragging(undefined);
    };

    const startDragVarHeader = (variable: IVariableDisplay, x: number, y: number) => props.setDragging({
        type: DragType.Variable,
        variable,
        x,
        y,
    });

    const startDragVarConnector = (variable: IVariableDisplay, input: boolean, x: number, y: number) => props.setDragging({
        type: DragType.VarParameter,
        variable,
        input,
        x,
        y,
    });

    const stopDragVarConnector = (variable: IVariableDisplay, input: boolean) => {
        if (props.dragging !== undefined && props.dragging.type === DragType.StepParameter && props.dragging.input !== input) {
            context({
                type: 'link variable',
                inProcessName: props.processName,
                stepId: props.dragging.step.uniqueId,
                stepParamName: props.dragging.param.name,
                stepInputParam: props.dragging.input,
                varName: variable.name,
            });
        }

        props.setDragging(undefined);
    }

    props.stepRefs.clear();

    const steps = props.steps.map(step => {
        const focusThisStep = step.uniqueId === props.focusStepId;
        
        const isValid = true; // TODO: determine this

        const stepPos: ICoord = props.dragging !== undefined
            && props.dragging.type === DragType.Step
            && props.dragging.step === step
                ? props.dragging
                : step;

        const inputConnected = false; // TODO: determine this

        return (
            <StepDisplay
                ref={s => { if (s !== null) { props.stepRefs.set(step.uniqueId, s); } else { props.stepRefs.delete(step.uniqueId); }}}
                key={step.uniqueId}
                name={step.name}
                description={step.description}
                inputs={step.inputs}
                outputs={step.outputs}
                returnPaths={step.returnPaths}
                isValid={isValid}
                stepType={step.stepType}
                uniqueId={step.uniqueId}
                x={stepPos.x}
                y={stepPos.y}

                inProcessName={props.processName}
                inputConnected={inputConnected}
                focused={focusThisStep}
                focusParameter={focusThisStep ? props.focusParameter : undefined}
                focusReturnPath={focusThisStep ? props.focusReturnPath : undefined}
                readonly={false}
                canDelete={step.stepType !== StepType.Start}
                headerMouseDown={(x, y) => startDragStepHeader(step, x, y)}
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
        const canEdit = true; // TODO: determine this based on type having a validationExpression or not

        const focusThisVar = variable.name === props.focusVariableName;
        
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
                canEdit={canEdit}
                focused={focusThisVar}
                inputConnected={variable.inputConnected}
                outputConnected={variable.outputConnected}
                inProcessName={props.processName}
                key={variable.name}
                
                headerMouseDown={(x, y) => startDragVarHeader(variable, x, y)}
                connectorMouseDown={(input, x, y) => startDragVarConnector(variable, input, x, y)}
                connectorMouseUp={input => stopDragVarConnector(variable, input)}
            />
        );
    });

    return <>
        {steps}
        {variables}
    </>
}