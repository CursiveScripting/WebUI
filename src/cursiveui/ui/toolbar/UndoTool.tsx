import * as React from 'react';

export interface UndoToolProps {
    undo?: () => void;
    redo?: () => void;
}

export const UndoTool = (props: UndoToolProps) => {
    const undoClasses = props.undo === undefined
        ? 'tool tool--undo tool--disabled'
        : 'tool tool--undo';

    const redoClasses = props.redo === undefined
        ? 'tool tool--redo tool--disabled'
        : 'tool tool--redo';

    return <>
        <div className={undoClasses} onClick={props.undo} title={props.undo === undefined ? 'Nothing to undo' : undefined}>
            <div className="tool__label">Undo</div>
            <div className="tool__icon" />
        </div>

        <div className={redoClasses} onClick={props.redo} title={props.redo === undefined ? 'Nothing to redo' : undefined}>
            <div className="tool__label">Redo</div>
            <div className="tool__icon" />
        </div>
    </>
}