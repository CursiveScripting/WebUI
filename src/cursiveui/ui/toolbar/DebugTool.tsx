import * as React from 'react';
import { Tool, ToolState } from './Tool';
import './DebugTool.css';

interface Props {
    debug?: () => void;
}

export const DebugTool = (props: Props) => {
    if (props.debug === undefined) {
        return <Tool
            prompt="Save changes to debug"
            className="tool--debug"
            state={ToolState.Disabled}
        />
    }

    return <Tool
        prompt="Start debugging"
        className="tool--debug"
        onClick={props.debug}
        state={ToolState.Normal}
    />
}