import * as React from 'react';
import { ValidationError } from '../data/ValidationError';
import { ProcessContent } from './ProcessContent/ProcessContent';
import { ProcessSelector } from './sidebar/ProcessSelector';
import { ProcessToolbar } from './toolbar/ProcessToolbar';
import { ProcessEditor } from './ProcessSignature/ProcessEditor';
import './WorkspaceEditor.css';
import { IUserProcess } from '../workspaceState/IUserProcess';
import { IProcess } from '../workspaceState/IProcess';
import { WorkspaceDispatchContext } from '../workspaceState/actions';
import { IType } from '../workspaceState/IType';
import { createMap } from '../services/DataFunctions';
import { IStepDisplayParam } from './ProcessContent/IStepDisplay';

interface Props {
    processes: IProcess[];
    types: IType[]
    initialProcess?: IUserProcess;
    className?: string;
    save: () => void;
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
    typesByName: Map<string, IType>;
    processesByName: Map<string, IProcess>;

    openProcess?: IUserProcess;
    editingSignature: boolean;
    dropping?: DropInfo;
    processErrors: ValidationError[];
    processesWithErrors: IUserProcess[];
    otherProcessesHaveErrors: boolean;
    focusStepId?: string;
    focusStepParameter?: IStepDisplayParam;
    focusStepReturnPath?: string | null;
    focusVariableName?: string;
}

export class WorkspaceEditor extends React.PureComponent<Props, State> {
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;

    constructor(props: Props) {
        super(props);

        this.state = {
            typesByName: createMap(props.types, t => t.name),
            processesByName: createMap(props.processes, p => p.name),

            openProcess: props.initialProcess === undefined
                ? props.processes.find(p => !p.isSystem) as IUserProcess
                : props.initialProcess,
            editingSignature: false,
            otherProcessesHaveErrors: false,
            processErrors: [],
            processesWithErrors: this.getProcessesWithErrors(props.processes),
        };
    }
    
    componentWillMount() {
        if (this.state.openProcess !== undefined) {
            this.openProcess(this.state.openProcess);
        }
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.types !== this.props.types) {
            this.setState({
                typesByName: createMap(nextProps.types, t => t.name),
            });
        }
        
        if (nextProps.processes !== this.props.processes) {
            this.setState({
                processesByName: createMap(nextProps.processes, p => p.name),
            });
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
                    {this.renderProcessList()}
                    {this.renderSignatureHeader()}
                    {this.renderSignatureEditor()}
                </div>
            );
        }

        const addButton = <div role="button" className="workspaceEditor__addNew" onClick={() => this.showNewProcess()}>Add process</div>;

        return (
            <div className={classes}>
                {this.renderProcessList()}
                {addButton}
                {this.renderProcessToolbar()}
                {this.renderProcessContent()}
            </div>
        );
    }

    private renderProcessList() {
        return (
            <ProcessSelector
                className="workspaceEditor__sidebar"
                processes={this.props.processes}
                openProcess={this.state.openProcess}
                processOpened={process => this.openProcess(process)}
                editDefinition={process => this.showEditProcess(process)}
                processSelected={process => this.selectProcess(process)}
                errorProcesses={this.state.processesWithErrors}
                stopStepSelected={step => this.selectStopStep(step)}
                dataTypes={this.props.types}
                dataTypeSelected={type => this.selectDataType(type)}
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
                openProcess={this.state.openProcess}
                processesByName={this.state.processesByName}
                typesByName={this.state.typesByName}

                dropping={this.state.dropping}
                dropComplete={() => this.dropCompleted()}

                revalidate={() => this.revalidateOpenProcess()}
                focusStepId={this.state.focusStepId}
                focusStepParameter={this.state.focusStepParameter}
                focusStepReturnPath={this.state.focusStepReturnPath}
                focusVariableName={this.state.focusVariableName}
            />
        );
    }

    private renderProcessToolbar() {
        return (
            <ProcessToolbar
                validationErrors={this.state.processErrors}
                otherProcessesHaveErrors={this.state.otherProcessesHaveErrors}
                className="workspaceEditor__toolbar"
                saveProcesses={() => this.props.save()}
                focusError={error => this.focusOnError(error)}
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
        // TODO: validation data needs stored somewhere (in the store? in a state here?) and accessed as needed
        const processErrors: ValidationError[] = []; // this.props.workspace.validationSummary.getErrorsForProcess(process);
        // let isValid = processErrors.length === 0;

        let otherProcessesHaveErrors = false; // this.props.workspace.validationSummary.numErrorProcesses > (isValid ? 0 : 1);

        this.setState({
            openProcess: process,
            processErrors: processErrors,
            otherProcessesHaveErrors: otherProcessesHaveErrors,
        });
    }

    private selectDataType(type: IType) {
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
        this.revalidateOpenProcess();

        this.setState({
            openProcess: this.state.openProcess,
        });
    }

    private getProcessesWithErrors(processes: IProcess[]) {
        return [];
        /*
        return workspace.validationSummary.errorProcessNames
            .map(n => workspace.userProcesses.get(n)!)
            .filter(p => p !== undefined);
        */
    }

    private revalidateOpenProcess() {
        if (this.state.openProcess === undefined) {
            return;
        }
        
        let wasValid = false;// this.props.workspace.validationSummary.getErrorsForProcess(this.state.openProcess).length === 0;
        let processErrors: ValidationError[] = []; // this.props.workspace.validateProcess(this.state.openProcess);
        let isValid = false; // processErrors.length === 0;

        let otherProcessesHaveErrors = false; // this.props.workspace.validationSummary.numErrorProcesses > (isValid ? 0 : 1);

        this.setState({
            processErrors: processErrors,
            otherProcessesHaveErrors: otherProcessesHaveErrors,
        });

        if (wasValid === isValid) {
            return;
        }
        
        // validity has changed, update the "invalid processes" list for the sidebar
        this.setState(prevState => {
            const processesWithErrors = prevState.processesWithErrors.slice();
            if (prevState.openProcess !== undefined) {
                if (isValid) {
                    processesWithErrors.splice(processesWithErrors.indexOf(prevState.openProcess, 1));
                }
                else {
                    processesWithErrors.push(prevState.openProcess);
                }
            }
            return {
                processesWithErrors: processesWithErrors,
            };
        });
    }

    private focusOnError(error?: ValidationError) {
        if (error === undefined) {
            this.setState({
                focusStepId: undefined,
                focusStepParameter: undefined,
                focusStepReturnPath: undefined,
            });
            return;
        }

        /*
        this.setState({
            focusStep: error.step,
            focusStepParameter: error.parameter === null ? undefined : error.parameter,
            focusStepReturnPath: error.returnPath,
        });
        */
    }
}