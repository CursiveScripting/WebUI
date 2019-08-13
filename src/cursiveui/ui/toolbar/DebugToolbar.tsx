import * as React from 'react';
import './ProcessToolbar.css';
import { Tool, ToolState } from './Tool';
import { IDebugState } from '../../debug/IDebugState';

interface Props {
    className?: string;
    isPaused: boolean;
    continue: () => Promise<void>;
    pause: () => Promise<IDebugState>;
    stop: () => Promise<void>;
    stepInto: () => Promise<IDebugState>;
    stepOver: () => Promise<IDebugState>;
}

export const DebugToolbar = (props: Props) => {
    let classes = 'processToolbar processToolbar--debug';
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const pauseContinue = props.isPaused
        ? <Tool
            className="tool--continue"
            prompt="Continue"
            onClick={props.continue}
            state={ToolState.Normal}
        />
        : <Tool
            className="tool--pause"
            prompt="Pause"
            onClick={props.pause}
            state={ToolState.Normal}
        />
    
    return (
        <div className={classes}>
            {pauseContinue}
            
            <Tool
                className="tool--stop"
                prompt="Stop"
                onClick={props.stop}
                state={ToolState.Normal}
            />
            
            <Tool
                className="tool--stepInto"
                prompt="Step into"
                onClick={props.stepInto}
                state={props.isPaused ? ToolState.Normal : ToolState.Disabled}
            />
            
            <Tool
                className="tool--stepOver"
                prompt="Step over"
                onClick={props.stepOver}
                state={props.isPaused ? ToolState.Normal : ToolState.Disabled}
            />
        </div>
    );
}