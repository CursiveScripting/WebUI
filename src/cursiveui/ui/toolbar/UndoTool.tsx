import * as React from 'react';
import { IUndoRedoAction } from '../../services/useUndoReducer';
import { Tool, ToolState } from './Tool';

export interface UndoToolProps {
    undo?: IUndoRedoAction;
    redo?: IUndoRedoAction;
}

function renderButton(name: string, nameLower: string, action?: IUndoRedoAction) {
    if (action === undefined) {
        return <Tool
            prompt={'Cannot ' + nameLower}
            className={'tool--' + nameLower}
            state={ToolState.Disabled}
        />
    }

    return <Tool
        prompt={`${name} ${action.name}`}
        onClick={action.perform}
        className={'tool--' + nameLower}
        state={ToolState.Normal}
    />
}

export const UndoTool = (props: UndoToolProps) => {
    return <>
        {renderButton('Undo', 'undo', props.undo)}
        {renderButton('Redo', 'redo', props.redo)}
    </>
}