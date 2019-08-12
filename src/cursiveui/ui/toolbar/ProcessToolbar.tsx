import * as React from 'react';
import { SaveTool, SaveToolProps } from './SaveTool';
import { UndoToolProps, UndoTool } from './UndoTool';
import './ProcessToolbar.css';
import { Tool, ToolState } from './Tool';

interface ProcessToolbarProps extends SaveToolProps, UndoToolProps {
    className?: string;
    close?: () => void;
}

export const ProcessToolbar = (props: ProcessToolbarProps) => {
    let classes = 'processToolbar';
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const close = props.close === undefined
        ? undefined
        : <Tool
            className="tool--close"
            prompt="Close editor"
            onClick={props.close}
            state={ToolState.Normal}
        />

    return (
        <div className={classes}>
            <SaveTool
                validationErrors={props.validationErrors}
                saveProcesses={props.saveProcesses}
                otherProcessesHaveErrors={props.otherProcessesHaveErrors}
                focusError={props.focusError}
            />

            {close}

            <UndoTool
                undo={props.undo}
                redo={props.redo}
            />
        </div>
    );
}