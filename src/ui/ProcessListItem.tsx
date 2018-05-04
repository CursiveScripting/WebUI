import * as React from 'react';
import { Process, UserProcess, SystemProcess } from '../data';
import './ProcessListItem.css';

interface ProcessListItemProps {
    process: Process;
    isOpen: boolean;
}

export class ProcessListItem extends React.PureComponent<ProcessListItemProps, {}> {
    render() {
        let classes = 'processListItem';
        if (this.props.isOpen) {
            classes += ' processListItem--open';
        }

        if (this.props.process instanceof UserProcess) {
            classes += ' processListItem--user';
        }
        else if (this.props.process instanceof SystemProcess) {
            classes += ' processListItem--system';
        }

        return (
            <div className={classes}>
                <div className="processListItem__name">{this.props.process.name}</div>
                <div className="processListItem__desc">{this.props.process.description}</div>
            </div>
        );
    }
}