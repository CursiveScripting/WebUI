import * as React from 'react';
import { StepDisplay } from './StepDisplay';
import { IParameter } from '../../workspaceState/IParameter';
import { IStep, StepType } from '../../workspaceState/IStep';
import { isStopStep } from '../../services/StepFunctions';

interface Props {
    steps: IStep[];
    refs: Map<IStep, StepDisplay>;

    startDragHeader: (step: IStep, x: number, y: number) => void;

    startDragInputPath: (step: IStep, x: number, y: number) => void;
    stopDragInputPath: (step: IStep) => void;

    startDragReturnPath: (step: IStep, path: string | null, x: number, y: number) => void;
    stopDragReturnPath: (step: IStep, path: string | null) => void;

    startDragConnector: (param: IParameter, step: IStep, x: number, y: number, input: boolean) => void;
    stopDragConnector: (param: IParameter, step: IStep, input: boolean) => void;

    focusStep?: IStep;
    focusParameter?: IParameter;
    focusReturnPath?: string | null;
}

export const StepsDisplay = (props: Props) => {
    props.refs.clear();

    const steps = props.steps.map(step => {
        const focusThisStep = step === props.focusStep;
        
        const displayName = 'something'; // TODO: determine this
        const description = ''; // TODO: determine this
        const inputs: IParameter[] = []; // TODO: determine this
        const outputs: IParameter[] = []; // TODO: determine this
        const returnPaths: string[] = []; // TODO: determine this
        const isValid = true; // TODO: determine this

        return (

        <StepDisplay
            ref={s => { if (s !== null) { props.refs.set(step, s); } else { props.refs.delete(step); }}}
            key={step.uniqueId}
            displayName={displayName}
            description={description}
            inputs={inputs}
            outputs={outputs}
            returnPaths={returnPaths}
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
            headerMouseDown={(x, y) => props.startDragHeader(step, x, y)}
            inputLinkMouseDown={(x, y) => props.startDragInputPath(step, x, y)}
            inputLinkMouseUp={() => props.stopDragInputPath(step)}
            outputLinkMouseDown={(x, y, returnPath) => props.startDragReturnPath(step, returnPath, x, y)}
            outputLinkMouseUp={returnPath => props.stopDragReturnPath(step, returnPath)}
            parameterLinkMouseDown={(x, y, param, input) => props.startDragConnector(param, step, x, y, input)}
            parameterLinkMouseUp={(param, input) => props.stopDragConnector(param, step, input)}
        />

        )
    });

    return <>
        {steps}
    </>
}