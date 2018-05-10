import * as React from 'react';
import { UserProcess, SystemProcess, Process } from '../data';
import { ProcessListItem } from './ProcessListItem';
import { ValidationSummary } from '../data/ValidationSummary';
import './ProcessList.css';

interface ProcessListProps {
    systemProcesses: SystemProcess[];
    userProcesses: UserProcess[];
    openProcess?: UserProcess;
    selectedProcess?: Process;
    className?: string;
    validationSummary: ValidationSummary;
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
        let errors = this.props.validationSummary.getErrors(process);
        let numErrors = errors === null ? 0 : errors.length;

        // TODO: allow opening
        return (
            <ProcessListItem
                process={process}
                key={index}
                isOpen={process === this.props.openProcess}
                isSelected={this.props.selectedProcess === process}
                numErrors={numErrors}
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
                numErrors={0}
                onMouseDown={() => this.props.processSelected(process)}
            />
        );
    }
}