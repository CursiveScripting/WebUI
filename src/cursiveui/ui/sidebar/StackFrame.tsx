import * as React from 'react';
import './StackFrame.css';

interface Props {
    selected: boolean;
    processName: string;
    stepId: string; // TODO: hmm if this could be given the actual process(es) it could get the display name for the step, I guess
    onClick: () => void;
}

export const StackFrame: React.FunctionComponent<Props> = props => {
    const classes = props.selected
        ? 'stackFrame stackFrame--selected'
        : 'stackFrame';

    return (
        <div className={classes}>
            <span className="stackFrame__process">{props.processName}</span>
            <span className="stackFrame__step">{props.stepId}</span>
        </div>
    );
}