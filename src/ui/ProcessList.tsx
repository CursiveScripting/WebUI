import * as React from 'react';
import { UserProcess, SystemProcess, Process } from '../data';
import { ProcessListItem } from './ProcessListItem';
import './ProcessList.css';

interface ProcessListProps {
    systemProcesses: SystemProcess[];
    userProcesses: UserProcess[];
    openProcess?: UserProcess;
    selectedProcess?: Process;
    className?: string;
    errorProcesses: UserProcess[];
    processSelected: (process: Process) => void;
}

export class ProcessList extends React.PureComponent<ProcessListProps, {}> {
    render() {
        let classes = 'processList';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        return (
            <div className={classes}>
                {this.props.userProcesses.map((p, i) => this.renderUserProcess(p, i))}
                {this.props.systemProcesses.map((p, i) => this.renderSystemProcess(p, i))}
            </div>
        );
    }

    private renderUserProcess(process: UserProcess, index: number) {
        let hasErrors = this.props.errorProcesses.indexOf(process) !== -1;

        // TODO: allow opening
        return (
            <ProcessListItem
                process={process}
                key={index}
                isOpen={process === this.props.openProcess}
                isSelected={this.props.selectedProcess === process}
                hasError={hasErrors}
                onMouseDown={() => this.props.processSelected(process)}
            />
        );
    }

    private renderSystemProcess(process: SystemProcess, index: number) {
        return (
            <ProcessListItem
                process={process}
                key={index}
                isOpen={false}
                isSelected={this.props.selectedProcess === process}
                hasError={false}
                onMouseDown={() => this.props.processSelected(process)}
            />
        );
    }
}