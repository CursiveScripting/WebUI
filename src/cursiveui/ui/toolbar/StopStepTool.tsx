import * as React from 'react';
import { Tool, ToolState } from './Tool';
import './StopStepTool.css';

interface Props {
    returnPaths: string[];
    startDrag: (path: string | null) => void;
}

export const StopStepTool: React.FunctionComponent<Props> = props => {

    const classes = props.returnPaths.length === 0
        ? 'tool--stop tool--stopSingle'
        : 'tool--stop tool--stopMulti'

    const dragParent = props.returnPaths.length === 0
        ? () => props.startDrag(null)
        : undefined;

    return <Tool
        className={classes}
        state={ToolState.Normal}
        prompt="Add stop step"
        onMouseDown={dragParent}
    >
        {props.returnPaths.map((path, index) => renderSelector(path, index, () => props.startDrag(path)))}
    </Tool>
}

function renderSelector(returnPath: string, index: number, startDrag: () => void) {
    return (
        <div
            className="tool__popoutItem returnPathSelector"
            key={index}
            onMouseDown={startDrag}
        >
            <div className="returnPathSelector__swatch" />
            {returnPath}
        </div>
    );
}