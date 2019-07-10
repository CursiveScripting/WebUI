import * as React from 'react';
import { useState } from 'react';
import { StepDisplay } from './StepDisplay';
import { IParameter } from '../../workspaceState/IParameter';
import { IStep, StepType, IStepWithParams } from '../../workspaceState/IStep';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { getStepInputParameters, getStepOutputParameters, getStepReturnPaths } from '../../services/StepFunctions';

interface Props {
    steps: IStepWithParams[];
    refs: Map<string, StepDisplay>;

    processName: string;
    focusStep?: IStep;
    focusParameter?: IParameter;
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
    param: IParameter;
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

    const startDragParameter = (step: IStep, param: IParameter, input: boolean, x: number, y: number) => {
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

    const stopDragParameter = (step: IStep, param: IParameter, input: boolean) => {
        if (dragging !== undefined && dragging.type === 'parameter') {
            // TODO: link both parameters with a variable
        }

        // TODO: somehow link steps and variables

        setDragging(undefined);
    }

    const steps = props.steps.map(step => {
        const focusThisStep = step === props.focusStep;
        
        const displayName = 'something'; // TODO: determine this
        const description = ''; // TODO: determine this
        const isValid = true; // TODO: determine this

        return (

        <StepDisplay
            ref={s => { if (s !== null) { props.refs.set(step.uniqueId, s); } else { props.refs.delete(step.uniqueId); }}}
            key={step.uniqueId}
            displayName={displayName}
            description={description}
            inputs={step.inputParams}
            outputs={step.outputParams}
            returnPaths={step.returnPathNames}
            isValid={isValid}
            stepType={step.stepType}
            stepId={step.uniqueId}
            x={step.x}
            y={step.y}

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