import * as React from 'react';
import './ToolboxItem.css';

export enum ToolboxItemType {
    SystemProcess,
    UserProcess,
    StopStep,
}

interface Props {
    name: string;
    subName?: string;
    description?: string;
    type: ToolboxItemType;

    isOpen?: boolean;
    isSelected?: boolean;
    hasError?: boolean;
    onMouseDown: () => void;
    onMouseUp?: () => void;
    clickHeader?: () => void;
    clickEdit?: () => void;
}

export const ToolboxItem = (props: Props) => {
        let classes = 'toolboxItem';
        if (props.isOpen) {
            classes += ' toolboxItem--open';
        }
        if (props.isSelected) {
            classes += ' toolboxItem--selected';
        }
        if (props.hasError) {
            classes += ' toolboxItem--invalid';
        }
        
        if (props.subName) {
            classes += ' toolboxItem--subname';
        }

        switch (props.type) {
            case ToolboxItemType.UserProcess:
                classes += ' toolboxItem--user';
                break;
            case ToolboxItemType.SystemProcess:
                classes += ' toolboxItem--system';
                break;
            case ToolboxItemType.StopStep:
                classes += ' toolboxItem--stop';
                break;
        }
        
        const headerClicked = props.clickHeader;
        const clickHeader = headerClicked === undefined ? undefined : () => headerClicked();

        const editClicked = props.clickEdit;
        const editLink = editClicked === undefined ? undefined : (
            <div className="toolboxItem__editLink" onClick={() => editClicked()}>Edit definition</div>
        );

        const description = props.description === undefined
            ? undefined
            : <div className="toolboxItem__desc">{props.description}</div>

        const subName = props.subName === undefined
            ? undefined
            : <div className="toolboxItem__subname">{props.subName}</div>

        return (
            <div className={classes} onMouseDown={props.onMouseDown} onMouseUp={props.onMouseUp}>
                <div className="toolboxItem__header" onClick={clickHeader}>
                    <div className="toolboxItem__name">{props.name}</div>
                    {subName}
                </div>
                {description}
                {editLink}
            </div>
        );
}