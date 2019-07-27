import * as React from 'react';
import { IUndoRedoAction } from '../../services/useUndoReducer';

export interface UndoToolProps {
    undo?: IUndoRedoAction;
    redo?: IUndoRedoAction;
}

const ButtonTool = (props: {
    action?: IUndoRedoAction
    className: string;
    actionType: 'Undo' | 'Redo';
}) => {
    let classes: string;
    let label: string;
    let action: undefined | (() => void);

    if (props.action === undefined) {
        classes = 'tool tool--undo tool--disabled';
        label = `Cannot ${props.actionType.toLowerCase()}`;
    }
    else {
        classes = 'tool tool--undo';
        label = `${props.actionType} ${props.action.name}`;
        action = props.action.perform;
    }

    return (
        <div className={classes} onClick={action}>
            <div className="tool__label">{label}</div>
            <div className="tool__icon" />
        </div>
    )
}

export const UndoTool = (props: UndoToolProps) => {
    return <>
        <ButtonTool
            action={props.undo}
            className="tool--undo"
            actionType="Undo"
        />
        
        <ButtonTool
            action={props.redo}
            className="tool--redo"
            actionType="Redo"
        />
    </>
}