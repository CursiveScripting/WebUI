import * as React from 'react';
import { ProcessContent } from './ProcessContent/ProcessContent';
import { ProcessSelector } from './sidebar/ProcessSelector';
import { ProcessToolbar } from './toolbar/ProcessToolbar';
import { ProcessEditor } from './ProcessSignature/ProcessEditor';
import './WorkspaceEditor.css';
import { IUserProcess } from '../state/IUserProcess';
import { IProcess } from '../state/IProcess';
import { DataType } from '../state/IType';
import { WorkspaceDispatchContext } from '../reducer';
import { IUndoRedoAction } from '../services/useUndoReducer';
import { IValidationError } from '../state/IValidationError';
import { isUserProcess } from '../services/ProcessFunctions';
import { ICustomTool } from '../ICustomTool';

interface Props {
    processes: IProcess[];
    types: DataType[]
    initialProcess?: IUserProcess;
    className?: string;
    save?: () => void;
    customTools?: ICustomTool[];
    undo?: IUndoRedoAction;
    redo?: IUndoRedoAction;
    startDebugger?: () => Promise<void>;
}

export type DropInfo = {
    type: 'variable';
    typeName: string;
} | {
    type: 'step';
    processName: string;
} | {
    type: 'stop';
    returnPath: string | null;
}

interface State {
    openProcess?: IUserProcess;

    editingSignature: boolean;
    dropping?: DropInfo;
    focusError?: IValidationError;
}

export class WorkspaceEditor extends React.PureComponent<Props, State> {
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;

    constructor(props: Props) {
        super(props);

        const initialProcess = props.initialProcess === undefined
            ? props.processes.find(p => !p.isSystem) as IUserProcess
            : props.initialProcess

        this.state = {
            openProcess: initialProcess,
            editingSignature: false,
        };
    }
    
    componentWillMount() {
        if (this.state.openProcess !== undefined) {
            this.openProcess(this.state.openProcess);
        }
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevProps.processes !== this.props.processes) {
            if (this.state.openProcess === undefined) {
                this.openProcess(this.props.processes.find(p => !p.isSystem) as IUserProcess);
            }
            else if (this.props.processes.indexOf(this.state.openProcess) === -1) {
                this.openProcess(this.props.processes.find(p => p.name === this.state.openProcess!.name) as IUserProcess);
            }
        }
    }

    render() {
        let classes = 'workspaceEditor';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        if (this.state.editingSignature) {
            classes += ' workspaceEditor--editDef';

            return (
                <div className={classes}>
                    {this.renderProcessSelector()}
                    {this.renderSignatureHeader()}
                    {this.renderSignatureEditor()}
                </div>
            );
        }

        const addButton = <div role="button" className="workspaceEditor__addNew" onClick={() => this.showNewProcess()}>Add process</div>;

        return (
            <div className={classes}>
                {this.renderProcessSelector()}
                {addButton}
                {this.renderProcessToolbar()}
                {this.renderProcessContent()}
            </div>
        );
    }

    private renderProcessSelector() {
        return (
            <ProcessSelector
                className="workspaceEditor__sidebar"
                processes={this.props.processes}
                openProcess={this.state.openProcess}
                processOpened={process => this.openProcess(process)}
                editDefinition={process => this.showEditProcess(process)}
                processSelected={process => this.selectProcess(process)}
                deselect={() => this.clearSelectedTools()}
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
                dropping={this.state.dropping}
                dropComplete={() => this.dropCompleted()}
                focusError={this.state.focusError}
            />
        );
    }

    private renderProcessToolbar() {
        return (
            <ProcessToolbar
                validationErrors={this.state.openProcess === undefined ? [] : this.state.openProcess.errors}
                otherProcessesHaveErrors={this.props.processes.find(p => p !== this.state.openProcess && isUserProcess(p) && p.errors.length > 0) !== undefined}
                className="workspaceEditor__toolbar"
                saveProcesses={this.props.save}
                startDebugging={this.props.startDebugger}
                returnPathNames={this.state.openProcess === undefined ? [] : this.state.openProcess.returnPaths}
                startDragReturnPath={name => this.selectStopStep(name)}
                dataTypes={this.props.types}
                startDragVariable={type => this.selectDataType(type)}
                customTools={this.props.customTools}
                undo={this.props.undo}
                redo={this.props.redo}
                focusError={error => this.setState({ focusError: error })}
            />
        );
    }

    private renderSignatureHeader() {
        const text = this.state.openProcess === undefined
            ? 'Add new process'
            : 'Edit process definition: ' + this.state.openProcess.name;

        return (
            <div className="workspaceEditor__header">
                {text}
            </div>
        );
    }

    private renderSignatureEditor() {
        return (
            <ProcessEditor
                process={this.state.openProcess}
                className="workspaceEditor__content"
                allTypes={this.props.types}
                allProcesses={this.props.processes}
                close={() => this.closeSignatureEditor()}
            />
        );
    }

    private showNewProcess() {
        this.showEditProcess();
    }

    private showEditProcess(process?: IUserProcess) {
        this.setState({
            editingSignature: true,
            openProcess: process,
        });
    }

    private closeSignatureEditor() {
        this.setState({
            editingSignature: false,
        });

        if (this.state.openProcess === undefined) {
            this.setState({
                openProcess: this.props.processes.find(p => !p.isSystem) as IUserProcess,
            });
        }
    }

    private openProcess(process: IUserProcess) {
        this.setState({
            openProcess: process,
        });
    }

    private selectDataType(type: DataType) {
        this.setState({
            dropping: {
                type: 'variable',
                typeName: type.name,
            },
        });
    }

    private selectProcess(process: IProcess) {
        this.setState({
            dropping: {
                type: 'step',
                processName: process.name,
            },
        });
    }

    private selectStopStep(pathName: string | null) {
        this.setState({
            dropping: {
                type: 'stop',
                returnPath: pathName,
            },
        });
    }

    private clearSelectedTools() {
        this.setState({
            dropping: undefined,
        });
    }

    private dropCompleted() {
        this.clearSelectedTools();

        this.setState({
            openProcess: this.state.openProcess,
        });
    }
}