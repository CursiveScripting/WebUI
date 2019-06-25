import * as React from 'react';
import { UserProcess, Workspace, Type, Process, Step, Variable, StepType, Parameter } from '../data';
import { ValidationError } from '../data/ValidationError';
import { ProcessContent } from './ProcessContent/ProcessContent';
import { ProcessSelector } from './sidebar/ProcessSelector';
import { ProcessToolbar } from './toolbar/ProcessToolbar';
import { ProcessEditor } from './ProcessSignature/ProcessEditor';
import './WorkspaceEditor.css';

interface Props {
    workspace: Workspace;
    initialProcess?: UserProcess;
    className?: string;
    save: () => void;
}

interface State {
    openProcess?: UserProcess;
    editingSignature: boolean;
    droppingDataType?: Type;
    droppingProcess?: Process;
    droppingStopStep?: string | null;
    draggingStep?: Step;
    draggingVariable?: Variable;
    processErrors: ValidationError[];
    processesWithErrors: UserProcess[];
    otherProcessesHaveErrors: boolean;
    focusStep?: Step;
    focusStepParameter?: Parameter;
    focusStepReturnPath?: string | null;
}

export class WorkspaceEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = {
            openProcess: props.initialProcess === undefined
                ? props.workspace.userProcesses.values().next().value
                : props.initialProcess,
            editingSignature: false,
            otherProcessesHaveErrors: false,
            processErrors: [],
            processesWithErrors: this.getProcessesWithErrors(props.workspace),
        };
    }
    
    componentWillMount() {
        if (this.state.openProcess !== undefined) {
            this.openProcess(this.state.openProcess);
        }
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevProps.workspace !== this.props.workspace) {
            this.openProcess(this.props.workspace.userProcesses.values().next().value);
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
                userProcesses={Array.from(this.props.workspace.userProcesses.values())}
                systemProcesses={Array.from(this.props.workspace.systemProcesses.values())}
                openProcess={this.state.openProcess}
                selectedProcess={this.state.droppingProcess}
                processOpened={process => this.openProcess(process)}
                editDefinition={process => this.showEditProcess(process)}
                processSelected={process => this.selectProcess(process)}
                errorProcesses={this.state.processesWithErrors}
                stopStepSelected={step => this.selectStopStep(step)}
                dataTypes={this.props.workspace.types}
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
                process={this.state.openProcess}
                dropVariableType={this.state.droppingDataType}
                dropStep={this.state.droppingProcess}
                dropStopStep={this.state.droppingStopStep}
                itemDropped={() => this.dropCompleted()}
                stepDragging={step => this.setState({ draggingStep: step })}
                variableDragging={variable => this.setState({ draggingVariable: variable })}
                revalidate={() => this.revalidateOpenProcess()}
                focusStep={this.state.focusStep}
                focusStepParameter={this.state.focusStepParameter}
                focusStepReturnPath={this.state.focusStepReturnPath}
            />
        );
    }

    private renderProcessToolbar() {
        return (
            <ProcessToolbar
                validationErrors={this.state.processErrors}
                otherProcessesHaveErrors={this.state.otherProcessesHaveErrors}
                selectedStep={this.state.draggingStep}
                selectedVariable={this.state.draggingVariable}
                className="workspaceEditor__toolbar"
                saveProcesses={() => this.props.save()}
                focusError={error => this.focusOnError(error)}
                removeSelectedItem={() => this.removeSelectedItem()}
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
                allTypes={Array.from(this.props.workspace.types.values())}
                allSystemProcesses={this.props.workspace.systemProcesses}
                allUserProcesses={this.props.workspace.userProcesses}
                processUpdated={(existingName, process) => this.saveSignature(existingName, process)}
                cancel={() => this.closeSignatureEditor()}
            />
        );
    }

    private showNewProcess() {
        this.showEditProcess();
    }

    private showEditProcess(process?: UserProcess) {
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
                openProcess: this.props.workspace.userProcesses.values().next().value,
            });
        }
    }

    private openProcess(process: UserProcess) {
        const processErrors = this.props.workspace.validationSummary.getErrorsForProcess(process);
        let isValid = processErrors.length === 0;

        let otherProcessesHaveErrors = this.props.workspace.validationSummary.numErrorProcesses > (isValid ? 0 : 1);

        this.setState({
            openProcess: process,
            processErrors: processErrors,
            otherProcessesHaveErrors: otherProcessesHaveErrors,
        });
    }
    
    private saveSignature(existingProcessName: string | null, process: UserProcess) {
        const userProcesses = this.props.workspace.userProcesses;

        if (existingProcessName !== null && userProcesses.has(existingProcessName)) {
            // if name has changed, remove from old name and save it under the new one
            if (existingProcessName !== process.name) {
                userProcesses.delete(existingProcessName);
                userProcesses.set(process.name, process);
            }

            // TODO: unhook any input links, output links and return paths that are no longer valid?

            this.props.workspace.validateAll();
            this.setState({
                processesWithErrors: this.getProcessesWithErrors(this.props.workspace),
            });
        }
        else {
            // adding new process
            userProcesses.set(process.name, process);
        }

        this.closeSignatureEditor();
    }

    private selectDataType(type: Type | undefined) {
        this.setState({
            droppingDataType: type === this.state.droppingDataType ? undefined : type,
            droppingProcess: undefined,
            droppingStopStep: undefined,
        });
    }

    private selectProcess(process: Process | undefined) {
        this.setState({
            droppingDataType: undefined,
            droppingProcess: process === this.state.droppingProcess ? undefined : process,
            droppingStopStep: undefined,
        });
    }

    private selectStopStep(pathName: string | null) {
        this.setState({
            droppingDataType: undefined,
            droppingProcess: undefined,
            droppingStopStep: this.state.droppingStopStep === pathName ? undefined : pathName,
        });
    }

    private clearSelectedTools() {
        this.setState({
            droppingDataType: undefined,
            droppingProcess: undefined,
            droppingStopStep: undefined,
        });
    }

    private dropCompleted() {
        this.clearSelectedTools();
        this.revalidateOpenProcess();

        this.setState({
            openProcess: this.state.openProcess,
        });
    }

    private removeSelectedItem() {
        if (this.state.openProcess === undefined) {
            return;
        }

        if (this.state.draggingStep !== undefined && this.state.draggingStep.stepType !== StepType.Start) {
            this.state.openProcess.removeStep(this.state.draggingStep);
            this.revalidateOpenProcess();
        }

        else if (this.state.draggingVariable !== undefined) {
            this.state.openProcess.removeVariable(this.state.draggingVariable);
            this.revalidateOpenProcess();
        }

        this.setState({
            draggingStep: undefined,
            draggingVariable: undefined,
        });
    }

    private getProcessesWithErrors(workspace: Workspace) {
        return workspace.validationSummary.errorProcessNames
            .map(n => workspace.userProcesses.get(n)!)
            .filter(p => p !== undefined);
    }

    private revalidateOpenProcess() {
        if (this.state.openProcess === undefined) {
            return;
        }
        
        let wasValid = this.props.workspace.validationSummary.getErrorsForProcess(this.state.openProcess).length === 0;
        let processErrors = this.props.workspace.validateProcess(this.state.openProcess);
        let isValid = processErrors.length === 0;

        let otherProcessesHaveErrors = this.props.workspace.validationSummary.numErrorProcesses > (isValid ? 0 : 1);

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
                focusStep: undefined,
                focusStepParameter: undefined,
                focusStepReturnPath: undefined,
            });
            return;
        }

        this.setState({
            focusStep: error.step,
            focusStepParameter: error.parameter === null ? undefined : error.parameter,
            focusStepReturnPath: error.returnPath,
        });
    }
}