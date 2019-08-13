import * as React from 'react';
import { IStackFrame } from '../../debug/IDebugState';
import { StackFrame } from './StackFrame';
import './ProcessSelector.css';

interface Props {
    className?: string;
    frames: IStackFrame[];
    openFrame?: IStackFrame;
    selectFrame: (frame: IStackFrame) => void;
}

export const CallStack: React.FunctionComponent<Props> = props => {
    let classes = 'processSelector processSelector--callStack';
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const frames = props.frames.map((frame, index) => <StackFrame
        key={index}
        onClick={() => props.selectFrame(frame)}
        selected={props.openFrame === frame}
        processName={frame.processName}
        stepId={frame.stepId}
    />)

    return (
        <div className={classes}>
            {frames}
        </div>
    );
}