import * as React from 'react';
import './Tool.css';

export enum ToolState {
    Normal,
    Disabled,
    Error,
}

interface Props {
    className?: string;
    state: ToolState;
    prompt: string;
    onClick?: () => void;
    onMouseDown?: () => void;
}

export const Tool: React.FunctionComponent<Props> = props => {
    let toolClasses = 'tool';

    if (props.className !== undefined) {
        toolClasses += ' ' + props.className;
    }

    switch (props.state)
    {
        case ToolState.Disabled:
            toolClasses += ' tool--disabled'; break;
        case ToolState.Error:
            toolClasses += ' tool--invalid'; break;
    }

    const popout = props.children === undefined
        ? undefined
        : <div className="tool__popout">{props.children}</div>

    const onClick = props.state === ToolState.Normal
        ? props.onClick
        : undefined;

    const onMouseDown = props.state === ToolState.Normal
        ? props.onMouseDown
        : undefined;

    return (
        <div className={toolClasses} onClick={onClick} onMouseDown={onMouseDown}>
            <div className="tool__label">{props.prompt}</div>
            <div className="tool__icon" />
            {popout}
        </div>
    );
}