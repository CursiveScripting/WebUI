import * as React from 'react';
import { UserProcess, Workspace } from '../data';
import { ProcessContent } from './ProcessContent';
import { ProcessList } from './ProcessList';
import './ProcessEditor.css';

interface ProcessEditorProps {
    workspace: Workspace;
    initialProcess?: UserProcess;
    className?: string;
}

interface ProcessEditorState {
    openProcess: UserProcess;
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
                <ProcessContent className="processEditor__content" process={this.state.openProcess} />
            </div>
        );
    }

    private renderToolbar() {
        return (
            <div className="processEditor__toolbar">
                Drag in variables of various types from here. Drag in stop steps, and have a bin to drag things onto to delete them
            </div>
        );
    }
}