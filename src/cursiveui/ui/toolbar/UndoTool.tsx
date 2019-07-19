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
    let undoClasses: string;
    let undoLabel: string;
    let undoAction: undefined | (() => void);

    if (props.action === undefined) {
        undoClasses = 'tool tool--undo tool--disabled';
        undoLabel = props.actionType;
    }
    else {
        undoClasses = 'tool tool--undo';
        undoLabel = `${props.actionType} ${props.action.name}`;
        undoAction = props.action.perform;
    }

    return (
        <div className={undoClasses} onClick={undoAction} title={props.action === undefined ? 'Nothing to {}' : undefined}>
            <div className="tool__label">{undoLabel}</div>
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