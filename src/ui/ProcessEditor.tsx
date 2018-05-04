import * as React from 'react';
import { UserProcess, Workspace, Type } from '../data';
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
}

export class ProcessEditor extends React.PureComponent<ProcessEditorProps, ProcessEditorState> {
    constructor(props: ProcessEditorProps) {
        super(props);

        this.state = {
            openProcess: props.initialProcess === undefined
                ? props.workspace.userProcesses.values[0]
                : props.initialProcess,
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
                />
                {this.renderToolbar()}
                <ProcessContent
                    className="processEditor__content"
                    process={this.state.openProcess}
                    dropVariableType={this.state.selectedDataType}
                    itemDropped={() => this.dropCompleted()}
                />
            </div>
        );
    }

    private renderToolbar() {
        return (
            <div className="processEditor__toolbar">
                <DataTypePicker
                    types={this.props.workspace.types.values}
                    selectedType={this.state.selectedDataType}
                    typeSelected={type => this.selectDataType(type)}
                />
                <div>Add stop step</div>
                <div>Bin</div>
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
            selectedDataType: undefined,
        });
    }
*/
    private selectDataType(type: Type | undefined) {
        this.setState({
            selectedDataType: type === this.state.selectedDataType ? undefined : type,
        });
    }

    private dropCompleted() {
        this.selectDataType(undefined);
    }
}