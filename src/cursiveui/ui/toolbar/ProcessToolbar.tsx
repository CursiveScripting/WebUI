import * as React from 'react';
import { SaveTool, SaveToolProps } from './SaveTool';
import { UndoToolProps, UndoTool } from './UndoTool';
import './ProcessToolbar.css';
import { Tool, ToolState } from './Tool';
import { ICustomTool } from '../..';

interface ProcessToolbarProps extends SaveToolProps, UndoToolProps {
    className?: string;
    customTools?: ICustomTool[];
}

export const ProcessToolbar = (props: ProcessToolbarProps) => {
    let classes = 'processToolbar';
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const customTools = React.useMemo(() => props.customTools === undefined
        ? undefined
        : props.customTools.map((tool, index) => {
            const action = tool.unsavedConfirmation !== undefined && props.saveProcesses !== undefined
                ? () => { if (window.confirm(tool.unsavedConfirmation!)) tool.action(); }
                : tool.action;

            return <Tool
                key={index}
                className={tool.icon}
                prompt={tool.prompt}
                onClick={action}
                state={ToolState.Normal}
            />
        }),
        [props.customTools, props.saveProcesses]
    );

    return (
        <div className={classes}>
            <SaveTool
                validationErrors={props.validationErrors}
                saveProcesses={props.saveProcesses}
                otherProcessesHaveErrors={props.otherProcessesHaveErrors}
                focusError={props.focusError}
            />

            {customTools}

            <UndoTool
                undo={props.undo}
                redo={props.redo}
            />
        </div>
    );
}