import * as React from 'react';
import { UserProcess, Workspace, Type, Process, Step, Variable, StepType, Parameter } from '../data';
import { ValidationError } from '../data/ValidationError';
import { ProcessContent } from './canvas/ProcessContent';
import { ProcessSelector } from './sidebar/ProcessSelector';
import { ProcessToolbar } from './toolbar/ProcessToolbar';
import { SignatureEditor } from './SignatureEditor';
import './ProcessEditor.css';

interface ProcessEditorProps {
    workspace: Workspace;
    initialProcess?: UserProcess;
    className?: string;
    save: () => void;
}

interface ProcessEditorState {
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

export class ProcessEditor extends React.PureComponent<ProcessEditorProps, ProcessEditorState> {
    constructor(props: ProcessEditorProps) {
        super(props);

        const errorProcessNames = props.workspace.validationSummary.errorProcessNames;
        const errorProcesses: UserProcess[] = [];
        for (const [name, proc] of props.workspace.userProcesses) {
            if (errorProcessNames.indexOf(name) !== -1) {
                errorProcesses.push(proc);
            }
        }

        this.state = {
            openProcess: props.initialProcess === undefined
                ? props.workspace.userProcesses.values().next().value
                : props.initialProcess,
            editingSignature: false,
            otherProcessesHaveErrors: false,
            processErrors: [],
            processesWithErrors: errorProcesses,
        };
    }
    
    componentWillMount() {
        if (this.state.openProcess !== undefined) {
            this.openProcess(this.state.openProcess);
        }
    }

    componentDidUpdate(prevProps: ProcessEditorProps, prevState: ProcessEditorState) {
        if (prevProps.workspace !== this.props.workspace) {
            this.openProcess(this.props.workspace.userProcesses.values().next().value);
        }
    }

    render() {
        let classes = 'processEditor';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        if (this.state.editingSignature) {
            classes += ' processEditor--editDef';

            return (
                <div className={classes}>
                    {this.renderProcessList()}
                    {this.renderSignatureHeader()}
                    {this.renderSignatureEditor()}
                </div>
            );
        }

        const addButton = <div role="button" className="processEditor__addNew" onClick={() => this.showNewProcess()}>Add process</div>;

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
                className="processEditor__sidebar"
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
                className="processEditor__content"
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
                className="processEditor__toolbar"
                saveProcesses={() => this.props.save()}
                focusError={error => this.focusOnError(error)}
                removeSelectedItem={() => this.removeSelectedItem()}
            />
        );
    }

    private renderSignatureHeader() {
        const text = this.state.openProcess === undefined
            ? 'Define new process'
            : 'Edit process definition: ' + this.state.openProcess.name;

        return (
            <div className="processEditor__definitionHeader">
                {text}
            </div>
        );
    }

    private renderSignatureEditor() {
        return (
            <SignatureEditor
                process={this.state.openProcess}
                className="processEditor__content"
                allTypes={Array.from(this.props.workspace.types.values())}
                save={process => this.saveSignature(process)}
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
    
    private saveSignature(process: UserProcess) {
        // TODO: add new or replace existing user process

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
        this.setState(prev => {
            const processesWithErrors = prev.processesWithErrors.slice();

            if (prev.openProcess !== undefined) {
                if (isValid) {
                    processesWithErrors.splice(processesWithErrors.indexOf(prev.openProcess, 1));
                }
                else {
                    processesWithErrors.push(prev.openProcess);
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