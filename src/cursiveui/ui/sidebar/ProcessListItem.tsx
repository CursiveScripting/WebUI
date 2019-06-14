import * as React from 'react';
import { Process, UserProcess, SystemProcess } from '../../data';
import './ProcessListItem.css';

interface ProcessListItemProps {
    process: Process;
    isOpen: boolean;
    isSelected: boolean;
    hasError: boolean;
    onMouseDown: () => void;
    clickHeader?: () => void;
    clickEdit?: () => void;
}

export class ProcessListItem extends React.PureComponent<ProcessListItemProps, {}> {
    render() {
        let classes = 'processListItem';
        if (this.props.isOpen) {
            classes += ' processListItem--open';
        }
        if (this.props.isSelected) {
            classes += ' processListItem--selected';
        }
        if (this.props.hasError) {
            classes += ' processListItem--invalid';
        }
        
        if (this.props.process instanceof UserProcess) {
            classes += ' processListItem--user';
        }
        else if (this.props.process instanceof SystemProcess) {
            classes += ' processListItem--system';
        }
        
        const headerClicked = this.props.clickHeader;
        const clickHeader = headerClicked === undefined ? undefined : () => headerClicked();

        const editClicked = this.props.clickEdit;
        const editLink = editClicked === undefined ? undefined : (
            <div className="processListItem__editLink" onClick={() => editClicked()}>Edit definition</div>
        );

        return (
            <div className={classes} onMouseDown={this.props.onMouseDown}>
                <div className="processListItem__header" onClick={clickHeader}>
                    <div className="processListItem__name">{this.props.process.name}</div>
                </div>
                <div className="processListItem__desc">{this.props.process.description}</div>
                {editLink}
            </div>
        );
    }
}