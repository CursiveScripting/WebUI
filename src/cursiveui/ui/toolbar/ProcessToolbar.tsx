import * as React from 'react';
import { SaveTool, SaveToolProps } from './SaveTool';
import './ProcessToolbar.css';

interface ProcessToolbarProps extends SaveToolProps {
    className?: string;
}

export class ProcessToolbar extends React.PureComponent<ProcessToolbarProps, {}> {
    render() {
        let classes = 'processToolbar';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        return (
            <div className={classes}>
                <SaveTool
                    validationErrors={this.props.validationErrors}
                    saveProcesses={this.props.saveProcesses}
                    otherProcessesHaveErrors={this.props.otherProcessesHaveErrors}
                    focusError={this.props.focusError}
                />
            </div>
        );
    }
}