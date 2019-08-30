import * as React from 'react';
import { SaveTool, SaveToolProps } from './SaveTool';
import { UndoToolProps, UndoTool } from './UndoTool';
import './ProcessToolbar.css';
import { Tool, ToolState } from './Tool';
import { ICustomTool } from '../../ICustomTool';
import { VariableTool } from './VariableTool';
import { DataType } from '../../state/IType';
import { StopStepTool } from './StopStepTool';
import { DebugTool } from './DebugTool';

interface ProcessToolbarProps extends SaveToolProps, UndoToolProps {
    className?: string;
    customTools?: ICustomTool[];

    startDebugging?: () => void;

    returnPathNames: string[];
    startDragReturnPath: (name: string | null) => void;

    dataTypes: DataType[];
    startDragVariable: (type: DataType) => void;
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
                prompt={tool.prompt}
                onClick={action}
                state={ToolState.Normal}
                iconBackground={tool.iconBackground}
            />
        }),
        [props.customTools, props.saveProcesses]
    );

    const debugTool = props.startDebugging === undefined
        ? undefined
        : <DebugTool
            debug={props.saveProcesses === undefined || props.validationErrors.length > 0 || props.otherProcessesHaveErrors ? undefined : props.startDebugging}
        />

    return (
        <div className={classes}>
            <SaveTool
                validationErrors={props.validationErrors}
                saveProcesses={props.saveProcesses}
                otherProcessesHaveErrors={props.otherProcessesHaveErrors}
                focusError={props.focusError}
            />

            {debugTool}

            {customTools}

            <VariableTool
                dataTypes={props.dataTypes}
                startDrag={props.startDragVariable}
            />

            <StopStepTool
                returnPaths={props.returnPathNames}
                startDrag={props.startDragReturnPath}
            />

            <UndoTool
                undo={props.undo}
                redo={props.redo}
            />
        </div>
    );
}