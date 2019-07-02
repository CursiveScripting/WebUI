import * as React from 'react';
import { Step, StepType, Parameter } from '../../data';
import { StepDisplay } from './StepDisplay';

interface Props {
    steps: Step[];
    refs: Map<Step, StepDisplay>;
    removeStep: (step: Step) => void;

    startDragHeader: (step: Step, x: number, y: number) => void;

    startDragInputPath: (step: Step) => void;
    stopDragInputPath: (step: Step) => void;

    startDragReturnPath: (step: Step, path: string | null) => void;
    stopDragReturnPath: (step: Step, path: string | null) => void;

    startDragConnector: (param: Parameter, step: Step, input: boolean) => void;
    stopDragConnector: (param: Parameter, step: Step, input: boolean) => void;

    focusStep?: Step;
    focusParameter?: Parameter;
    focusReturnPath?: string | null;
}

export const StepsDisplay = (props: Props) => {
    props.refs.clear();

    const steps = props.steps.map(step => (
        <StepDisplay
            ref={s => { if (s !== null) { props.refs.set(step, s); } else { props.refs.delete(step); }}}
            key={step.uniqueID}
            step={step}
            focused={step === props.focusStep}
            focusParameter={props.focusParameter}
            focusReturnPath={props.focusReturnPath}
            readonly={false}
            deleteClicked={step.stepType === StepType.Start ? undefined : () => props.removeStep(step)}
            headerMouseDown={(x, y) => props.startDragHeader(step, x, y)}
            inputLinkMouseDown={() => props.startDragInputPath(step)}
            inputLinkMouseUp={() => props.stopDragInputPath(step)}
            outputLinkMouseDown={returnPath => props.startDragReturnPath(step, returnPath)}
            outputLinkMouseUp={returnPath => props.stopDragReturnPath(step, returnPath)}
            parameterLinkMouseDown={(param, input) => props.startDragConnector(param, step, input)}
            parameterLinkMouseUp={(param, input) => props.stopDragConnector(param, step, input)}
        />
    ));

    return <>
        {steps}
    </>
}