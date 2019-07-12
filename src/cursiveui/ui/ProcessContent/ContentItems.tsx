import * as React from 'react';
import { useState, useMemo } from 'react';
import { StepDisplay } from './StepDisplay';
import { StepType } from '../../workspaceState/IStep';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { IStepDisplay, IStepDisplayParam } from './IStepDisplay';
import { ICoord } from './ProcessContent';
import { VariableDisplay } from './VariableDisplay';
import { IVariableDisplay } from './IVariableDisplay';

interface Props {
    steps: IStepDisplay[];
    variables: IVariableDisplay[];
    stepRefs: Map<string, StepDisplay>;
    varRefs: Map<string, VariableDisplay>;

    processName: string;
    focusVariableName?: string;
    focusStepId?: string;
    focusParameter?: IStepDisplayParam;
    focusReturnPath?: string | null;
}

type DragState = undefined | {
    type: 'step';
    step: IStepDisplay;
    x: number;
    y: number;
} | {
    type: 'variable';
    variable: IVariableDisplay;
    x: number;
    y: number;
} | {
    type: 'in';
    step: IStepDisplay;
} | {
    type: 'return path';
    step: IStepDisplay;
    path: string | null;
} | {
    type: 'step param';
    step: IStepDisplay;
    input: boolean;
    param: IStepDisplayParam;
} | {
    type: 'var param';
    variable: IVariableDisplay;
    input: boolean;
}

export const ContentItems = (props: Props) => {
    const [dragging, setDragging] = useState<DragState>(undefined);

    const context = React.useContext(WorkspaceDispatchContext);

    const steps = useMemo(() => {
        props.stepRefs.clear();

        const startDragHeader = (step: IStepDisplay, x: number, y: number) => setDragging({
            type: 'step',
            step,
            x,
            y,
        });

        const startDragInConnector = (step: IStepDisplay) => setDragging({
            type: 'in',
            step,
        });

        const startDragReturnPath = (step: IStepDisplay, path: string | null) => setDragging({
            type: 'return path',
            step,
            path,
        });

        const startDragParameter = (step: IStepDisplay, param: IStepDisplayParam, input: boolean) => {
            setDragging({
                type: 'step param',
                step,
                param,
                input,
            });
        }

        const stopDragInConnector = (step: IStepDisplay) => {
            if (dragging !== undefined && dragging.type === 'return path') {
                context({
                    type: 'set return path',
                    inProcessName: props.processName,
                    fromStepId: step.uniqueId,
                    pathName: dragging.path,
                    toStepId: dragging.step.uniqueId,
                });
            }

            setDragging(undefined);
        };

        const stopDragReturnPath = (step: IStepDisplay, path: string | null) => {
            if (dragging !== undefined && dragging.type === 'in') {
                context({
                    type: 'set return path',
                    inProcessName: props.processName,
                    fromStepId: dragging.step.uniqueId,
                    pathName: path,
                    toStepId: step.uniqueId,
                });
            }

            setDragging(undefined);
        }

        const stopDragParameter = (step: IStepDisplay, param: IStepDisplayParam, input: boolean) => {
            if (dragging !== undefined) {
                if (dragging.type === 'step param' && dragging.input !== input) {
                    // TODO: link both parameters with a variable
                }
                else if (dragging.type === 'var param' && dragging.input !== input) {
                    context({
                        type: 'link variable',
                        inProcessName: props.processName,
                        stepId: step.uniqueId,
                        stepParamName: param.name,
                        stepInputParam: input,
                        varName: dragging.variable.name,
                    });
                }
            }

            setDragging(undefined);
        }

        return props.steps.map(step => {
            const focusThisStep = step.uniqueId === props.focusStepId;
            
            const isValid = true; // TODO: determine this

            const stepPos: ICoord = dragging !== undefined
                && dragging.type === 'step'
                && dragging.step === step
                    ? dragging
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
                    headerMouseDown={(x, y) => startDragHeader(step, x, y)}
                    inputLinkMouseDown={() => startDragInConnector(step)}
                    inputLinkMouseUp={() => stopDragInConnector(step)}
                    outputLinkMouseDown={returnPath => startDragReturnPath(step, returnPath)}
                    outputLinkMouseUp={returnPath => stopDragReturnPath(step, returnPath)}
                    parameterLinkMouseDown={(param, input) => startDragParameter(step, param, input)}
                    parameterLinkMouseUp={(param, input) => stopDragParameter(step, param, input)}
                />
            )
        }
    )}, [context, props.processName, props.stepRefs, props.steps, props.focusStepId, props.focusParameter, props.focusReturnPath, dragging]);
   
    const variables = useMemo(() => {
        props.varRefs.clear();

        const startDragHeader = (variable: IVariableDisplay, x: number, y: number) => setDragging({
            type: 'variable',
            variable,
            x,
            y,
        });

        const startDragConnector = (variable: IVariableDisplay, input: boolean) => {
            setDragging({
                type: 'var param',
                variable,
                input,
            });
        }

        const stopDragConnector = (variable: IVariableDisplay, input: boolean) => {
            if (dragging !== undefined && dragging.type === 'step param' && dragging.input !== input) {
                context({
                    type: 'link variable',
                    inProcessName: props.processName,
                    stepId: dragging.step.uniqueId,
                    stepParamName: dragging.param.name,
                    stepInputParam: dragging.input,
                    varName: variable.name,
                });
            }

            setDragging(undefined);
        }

        props.variables.map(variable => {
            const canEdit = true; // TODO: determine this based on type having a validationExpression or not

            const focusThisVar = variable.name === props.focusVariableName;
            
            const varPos: ICoord = dragging !== undefined
                && dragging.type === 'variable'
                && dragging.variable === variable
                    ? dragging
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
                    
                    headerMouseDown={(x, y) => startDragHeader(variable, x, y)}
                    connectorMouseDown={(input) => startDragConnector(variable, input)}
                    connectorMouseUp={input => stopDragConnector(variable, input)}
                />
            );
        })
    }, [context, props.processName, props.varRefs, props.variables, props.focusVariableName, dragging]);

    return <>
        {steps}
        {variables}
    </>
}