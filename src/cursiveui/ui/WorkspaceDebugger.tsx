import * as React from 'react';
import { ProcessContent } from './ProcessContent/ProcessContent';
import './WorkspaceEditor.css';
import { IUserProcess } from '../state/IUserProcess';
import { IProcess } from '../state/IProcess';
import { IType } from '../state/IType';
import { IDebugState, IStackFrame } from '../debug/IDebugState';
import { IDebugConfiguration } from '../debug/IDebugConfiguration';
import { DebugToolbar } from './toolbar/DebugToolbar';
import { CallStack } from './sidebar/CallStack';

interface Props extends IDebugState, IDebugConfiguration {
    processes: IProcess[];
    types: IType[]
    initialProcess?: IUserProcess;
    className?: string;
}

interface State {
    openProcess?: IUserProcess;
    openFrame?: IStackFrame;
}

export class WorkspaceDebugger extends React.PureComponent<Props, State> {

    constructor(props: Props) {
        super(props);

        const initialProcess = props.initialProcess === undefined
            ? props.processes.find(p => !p.isSystem) as IUserProcess
            : props.initialProcess

        this.state = {
            openProcess: initialProcess,
        };
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevProps.processes !== this.props.processes) {
            if (this.state.openProcess === undefined) {
                this.setState({
                    openProcess: this.props.processes.find(p => !p.isSystem) as IUserProcess,
                });
            }
            else if (this.props.processes.indexOf(this.state.openProcess) === -1) {
                this.setState({
                    openProcess: this.props.processes.find(p => p.name === this.state.openProcess!.name) as IUserProcess,
                });
            }
        }
    }

    render() {
        let classes = 'workspaceEditor workspaceEditor--debug';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        return (
            <div className={classes}>
                {this.renderCallStack()}
                <div className="workspaceEditor__title">Debugging</div>
                {this.renderDebugToolbar()}
                {this.renderProcessContent()}
            </div>
        );
    }

    private renderCallStack() {
        return (
            <CallStack
                className="workspaceEditor__sidebar"
                frames={this.props.callStack}
                openFrame={this.state.openFrame}
                selectFrame={frame => this.openFrame(frame)}
            />
        );
    }

    private renderProcessContent() {
        if (this.state.openProcess === undefined) {
            return undefined;
        }

        return (
            <ProcessContent
                className="workspaceEditor__content"
                steps={this.state.openProcess.steps}
                variables={this.state.openProcess.variables}
                errors={this.state.openProcess.errors}
                processName={this.state.openProcess.name}
            />
        );
    }

    private renderDebugToolbar() {
        
        // TODO: pause, stepInto and stepOver need to update the state here when they're returned
        return (
            <DebugToolbar
                className="workspaceEditor__toolbar"
                isPaused={this.props.isPaused}
                continue={this.props.continue}
                pause={this.props.pause}
                stop={this.props.stop}
                stepInto={this.props.stepInto}
                stepOver={this.props.stepOver}
            />
        );
    }
    
    private openFrame(frame?: IStackFrame) {
        const process = frame === undefined
            ? undefined
            : this.props.processes.find(p => p.name === frame.processName) as IUserProcess;

        this.setState({
            openFrame: frame,
            openProcess: process,
        });
    }
}