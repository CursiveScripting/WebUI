import * as React from 'react';
import { UserProcess, Workspace, Type, Process } from '../data';
import { ProcessContent } from './ProcessContent';
import { ProcessList } from './ProcessList';
import { DataTypePicker } from './DataTypePicker';
import './ProcessEditor.css';

interface ProcessEditorProps {
    workspace: Workspace;
    initialProcess?: UserProcess;
    className?: string;
}

interface ProcessEditorState {
    openProcess: UserProcess;
    selectedDataType?: Type;
    selectedProcess?: Process;
    selectedStopStep: boolean;
}

export class ProcessEditor extends React.PureComponent<ProcessEditorProps, ProcessEditorState> {
    constructor(props: ProcessEditorProps) {
        super(props);

        this.state = {
            openProcess: props.initialProcess === undefined
                ? props.workspace.userProcesses.values[0]
                : props.initialProcess,
            selectedStopStep: false,
        };
    }
    
    render() {
        let classes = 'processEditor';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        return (
            <div className={classes}>
                <ProcessList
                    className="processEditor__sidebar"
                    userProcesses={this.props.workspace.userProcesses.values}
                    systemProcesses={this.props.workspace.systemProcesses.values}
                    openProcess={this.state.openProcess}
                    selectedProcess={this.state.selectedProcess}
                    processSelected={process => this.selectProcess(process)}
                />
                {this.renderToolbar()}
                <ProcessContent
                    className="processEditor__content"
                    process={this.state.openProcess}
                    dropVariableType={this.state.selectedDataType}
                    dropStep={this.state.selectedProcess}
                    dropStopStep={this.state.selectedStopStep}
                    itemDropped={() => this.dropCompleted()}
                />
            </div>
        );
    }

    private renderToolbar() {
        let stopClasses = 'tool stopStepTool';
        if (this.state.selectedStopStep) {
            stopClasses += ' stopStepTool--active';
        }

        return (
            <div className="processEditor__toolbar">
                <DataTypePicker
                    types={this.props.workspace.types.values}
                    selectedType={this.state.selectedDataType}
                    typeSelected={type => this.selectDataType(type)}
                />
                <div className={stopClasses} onMouseDown={() => this.selectStopStep()}>
                    <div className="tool_label">Add stop step:</div>
                    <div className="stopStepTool__icon" />
                </div>
                <div className="tool">Bin</div>
            </div>
        );
    }
/*
    private openProcess(process: UserProcess) {
        if (process === this.state.openProcess) {
            return;
        }

        this.setState({
            openProcess: process,
        });
        this.dropCompleted();
    }
*/
    private selectDataType(type: Type | undefined) {
        this.setState({
            selectedDataType: type === this.state.selectedDataType ? undefined : type,
            selectedProcess: undefined,
            selectedStopStep: false,
        });
    }

    private selectProcess(process: Process | undefined) {
        this.setState({
            selectedDataType: undefined,
            selectedProcess: process === this.state.selectedProcess ? undefined : process,
            selectedStopStep: false,
        });
    }

    private selectStopStep() {
        this.setState({
            selectedDataType: undefined,
            selectedProcess: undefined,
            selectedStopStep: !this.state.selectedStopStep,
        });
    }

    private dropCompleted() {
        this.setState({
            selectedDataType: undefined,
            selectedProcess: undefined,
            selectedStopStep: false,
        });
    }
}