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
        // TODO: allow opening
        return (
            <ProcessListItem
                process={process}
                key={index}
                isOpen={process === this.props.openProcess}
                isSelected={this.props.selectedProcess === process}
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
                onMouseDown={() => this.props.processSelected(process)}
            />
        );
    }
}