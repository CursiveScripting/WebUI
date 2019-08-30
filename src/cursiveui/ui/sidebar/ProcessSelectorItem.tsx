import * as React from 'react';
import './ProcessSelectorItem.css';

export enum ItemType {
    SystemProcess,
    UserProcess,
}

interface Props {
    name: string;
    subName?: string;
    description?: string;
    type: ItemType;

    visible: boolean;
    isOpen: boolean;
    isSelected: boolean;
    hasError: boolean;
    colorOverride?: string;
    onMouseDown: () => void;
    onMouseUp?: () => void;
    clickHeader?: () => void;
    clickEdit?: () => void;
}

export const ProcessSelectorItem = (props: Props) => {
        let classes = 'processSelectorItem';
        if (props.isOpen) {
            classes += ' processSelectorItem--open';
        }
        if (props.isSelected) {
            classes += ' processSelectorItem--selected';
        }
        if (props.hasError) {
            classes += ' processSelectorItem--invalid';
        }
        if (!props.visible) {
            classes += ' processSelectorItem--hidden';
        }
        
        if (props.subName) {
            classes += ' processSelectorItem--subname';
        }

        switch (props.type) {
            case ItemType.UserProcess:
                classes += ' processSelectorItem--user';
                break;
            case ItemType.SystemProcess:
                classes += ' processSelectorItem--system';
                break;
        }
        
        const headerClicked = props.clickHeader;
        const clickHeader = headerClicked === undefined ? undefined : () => headerClicked();

        const editClicked = props.clickEdit;
        const editLink = editClicked === undefined ? undefined : (
            <div className="processSelectorItem__editLink" onClick={() => editClicked()}>Edit definition</div>
        );

        const description = props.description === undefined
            ? undefined
            : <div className="processSelectorItem__desc">{props.description}</div>

        const subName = props.subName === undefined
            ? undefined
            : <div className="processSelectorItem__subname">{props.subName}</div>

        return (
            <div className={classes} onMouseDown={props.onMouseDown} onMouseUp={props.onMouseUp}>
                <div className="processSelectorItem__header" onClick={clickHeader}>
                    <div className="processSelectorItem__name">{props.name}</div>
                    {subName}
                </div>
                {description}
                {editLink}
            </div>
        );
}