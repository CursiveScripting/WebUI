import * as React from 'react';
import { Process, UserProcess, SystemProcess } from '../../data';
import './ProcessListItem.css';

interface Props {
    process: Process;
    isOpen: boolean;
    isSelected: boolean;
    hasError: boolean;
    onMouseDown: () => void;
    clickHeader?: () => void;
    clickEdit?: () => void;
}

export const ProcessListItem = (props: Props) => {
        let classes = 'processListItem';
        if (props.isOpen) {
            classes += ' processListItem--open';
        }
        if (props.isSelected) {
            classes += ' processListItem--selected';
        }
        if (props.hasError) {
            classes += ' processListItem--invalid';
        }
        
        if (props.process instanceof UserProcess) {
            classes += ' processListItem--user';
        }
        else if (props.process instanceof SystemProcess) {
            classes += ' processListItem--system';
        }
        
        const headerClicked = props.clickHeader;
        const clickHeader = headerClicked === undefined ? undefined : () => headerClicked();

        const editClicked = props.clickEdit;
        const editLink = editClicked === undefined ? undefined : (
            <div className="processListItem__editLink" onClick={() => editClicked()}>Edit definition</div>
        );

        return (
            <div className={classes} onMouseDown={props.onMouseDown}>
                <div className="processListItem__header" onClick={clickHeader}>
                    <div className="processListItem__name">{props.process.name}</div>
                </div>
                <div className="processListItem__desc">{props.process.description}</div>
                {editLink}
            </div>
        );
}