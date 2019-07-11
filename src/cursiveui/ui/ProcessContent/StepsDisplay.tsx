import * as React from 'react';
import { useState } from 'react';
import { StepDisplay } from './StepDisplay';
import { IStep, StepType } from '../../workspaceState/IStep';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { IStepDisplay, IStepDisplayParam } from './IStepDisplay';
import { ICoord } from './ProcessContent';

interface Props {
    steps: IStepDisplay[];
    refs: Map<string, StepDisplay>;

    processName: string;
    focusStep?: IStep;
    focusParameter?: IStepDisplayParam;
    focusReturnPath?: string | null;
}

type DragState = undefined | {
    type: 'header';
    step: IStep;
    x: number;
    y: number;
} | {
    type: 'in';
    step: IStep;
    x: number;
    y: number;
} | {
    type: 'return path';
    step: IStep;
    path: string | null;
    x: number;
    y: number;
} | {
    type: 'parameter';
    step: IStep;
    input: boolean;
    param: IStepDisplayParam;
    x: number;
    y: number;
}

export const StepsDisplay = (props: Props) => {
    props.refs.clear();

    const [dragging, setDragging] = useState<DragState>(undefined);

    const context = React.useContext(WorkspaceDispatchContext);

    const startDragHeader = (step: IStep, x: number, y: number) => setDragging({
        type: 'header',
        step,
        x,
        y,
    });

    const startDragInConnector = (step: IStep, x: number, y: number) => setDragging({
        type: 'in',
        step,
        x,
        y,
    });

    const startDragReturnPath = (step: IStep, path: string | null, x: number, y: number) => setDragging({
        type: 'return path',
        step,
        path,
        x,
        y,
    });

    const startDragParameter = (step: IStep, param: IStepDisplayParam, input: boolean, x: number, y: number) => {
        setDragging({
            type: 'parameter',
            step,
            param,
            input,
            x,
            y,
        });
    }

    const stopDragInConnector = (step: IStep) => {
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

    const stopDragReturnPath = (step: IStep, path: string | null) => {
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

    const stopDragParameter = (step: IStep, param: IStepDisplayParam, input: boolean) => {
        if (dragging !== undefined && dragging.type === 'parameter') {
            // TODO: link both parameters with a variable
        }

        // TODO: somehow link steps and variables

        setDragging(undefined);
    }

    const steps = props.steps.map(step => {
        const focusThisStep = step === props.focusStep;
        
        const isValid = true; // TODO: determine this

        const stepPos: ICoord = dragging !== undefined
            && dragging.type === 'header'
            && dragging.step === step
                ? dragging
                : step;

        const inputConnected = false; // TODO: determine this

        return (

        <StepDisplay
            ref={s => { if (s !== null) { props.refs.set(step.uniqueId, s); } else { props.refs.delete(step.uniqueId); }}}
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
            inputLinkMouseDown={(x, y) => startDragInConnector(step, x, y)}
            inputLinkMouseUp={() => stopDragInConnector(step)}
            outputLinkMouseDown={(x, y, returnPath) => startDragReturnPath(step, returnPath, x, y)}
            outputLinkMouseUp={returnPath => stopDragReturnPath(step, returnPath)}
            parameterLinkMouseDown={(x, y, param, input) => startDragParameter(step, param, input, x, y)}
            parameterLinkMouseUp={(param, input) => stopDragParameter(step, param, input)}
        />

        )
    });

    return <>
        {steps}
    </>
}