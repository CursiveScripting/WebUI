import * as React from 'react';
import { Process, UserProcess, SystemProcess } from '../data';
import './ProcessListItem.css';

interface ProcessListItemProps {
    process: Process;
    isOpen: boolean;
    isSelected: boolean;
    hasError: boolean;
    onMouseDown: () => void;
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
        
        return (
            <div className={classes} onMouseDown={this.props.onMouseDown}>
                <div className="processListItem__name">{this.props.process.name}</div>
                <div className="processListItem__desc">{this.props.process.description}</div>
            </div>
        );
    }
}