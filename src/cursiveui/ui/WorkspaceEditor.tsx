import * as React from 'react';
import { ValidationError } from '../data/ValidationError';
import { ProcessContent } from './ProcessContent/ProcessContent';
import { ProcessSelector } from './sidebar/ProcessSelector';
import { ProcessToolbar } from './toolbar/ProcessToolbar';
import { ProcessEditor } from './ProcessSignature/ProcessEditor';
import './WorkspaceEditor.css';
import { IWorkspaceState } from '../workspaceState/IWorkspaceState';
import { IUserProcess } from '../workspaceState/IUserProcess';
import { IProcess } from '../workspaceState/IProcess';
import { IStep } from '../workspaceState/IStep';
import { IParameter } from '../workspaceState/IParameter';
import { WorkspaceDispatchContext } from '../workspaceState/actions';
import { IType } from '../workspaceState/IType';
import { createMap } from '../services/DataFunctions';
import { useMemo } from 'react';
import { isStartStep, isStopStep } from '../services/StepFunctions';
import { IFullStep } from './ProcessContent/IFullStep';
import { IProcessStep } from '../workspaceState/IProcessStep';

interface Props {
    workspace: IWorkspaceState;
    initialProcess?: IUserProcess;
    className?: string;
    save: () => void;
}

interface State {
    openProcess?: IUserProcess;
    editingSignature: boolean;
    droppingDataType?: IType;
    droppingProcess?: IProcess;
    droppingStopStep?: string | null;
    processErrors: ValidationError[];
    processesWithErrors: IUserProcess[];
    otherProcessesHaveErrors: boolean;
    focusStep?: IStep;
    focusStepParameter?: IParameter;
    focusStepReturnPath?: string | null;
}

export class WorkspaceEditor extends React.PureComponent<Props, State> {
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;

    constructor(props: Props) {
        super(props);

        this.state = {
            openProcess: props.initialProcess === undefined
                ? props.workspace.processes.find(p => !p.isSystem) as IUserProcess
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
            if (this.state.openProcess === undefined) {
                this.openProcess(this.props.workspace.processes.find(p => !p.isSystem) as IUserProcess);
            }
            else if (this.props.workspace.processes.indexOf(this.state.openProcess) === -1) {
                this.openProcess(this.props.workspace.processes.find(p => p.name === this.state.openProcess!.name) as IUserProcess);
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
                processes={this.props.workspace.processes}
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

    private populateFullStep(
        step: IStep,
        inProcess: IProcess,
        processesByName: Map<string, IProcess>,
        typesByName: Map<string, IType>
    ): IFullStep {
        if (isStartStep(step)) {
            return {
                ...step,
                name: 'Start',
                inputParams: [],
                outputParams: inProcess.inputs.map(p => { return { name: p.name, type: typesByName.get(p.typeName)! }}),
                returnPathNames: [''],
            }
        }

        if (isStopStep(step)) {
            return {
                ...step,
                name: 'Stop',
                inputParams: inProcess.outputs.map(p => { return { name: p.name, type: typesByName.get(p.typeName)! }}),
                outputParams: [],
                returnPathNames: [],
            }
        }

        const process = processesByName.get((step as IProcessStep).processName)!;

        return {
            ...step,
            name: process.name,
            description: process.description,
            inputParams: process.inputs.map(p => { return { name: p.name, type: typesByName.get(p.typeName)! }}),
            outputParams: process.outputs.map(p => { return { name: p.name, type: typesByName.get(p.typeName)! }}),
            returnPathNames: process.returnPaths,
        };
    }

    private renderProcessContent() {
        if (this.state.openProcess === undefined) {
            return undefined;
        }

        const openProcess = this.state.openProcess;

        const typesByName = useMemo(
            () => createMap(this.props.workspace.types, t => t.name),
            [this.props.workspace.types]
        );

        const processesByName = useMemo(
            () => createMap(this.props.workspace.processes, p => p.name),
            [this.props.workspace.processes]
        );

        const steps = useMemo(
            () => openProcess.steps.map(s => this.populateFullStep(s, openProcess, processesByName, typesByName)),
            [openProcess, openProcess.steps, processesByName, typesByName]
        );

        return (
            <ProcessContent
                className="workspaceEditor__content"
                processName={openProcess.name}
                steps={steps}
                variables={openProcess.variables}
                typesByName={typesByName}

                dropVariableType={this.state.droppingDataType}
                dropStep={this.state.droppingProcess}
                dropStopStep={this.state.droppingStopStep}
                dropComplete={() => this.dropCompleted()}

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
                allTypes={this.props.workspace.types}
                allProcesses={this.props.workspace.processes}
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
                openProcess: this.props.workspace.processes.find(p => !p.isSystem) as IUserProcess,
            });
        }
    }

    private openProcess(process: IUserProcess) {
        // TODO: validation data needs stored somewhere (in the store? in a state here?) and accessed as needed
        const processErrors: ValidationError[] = []; // this.props.workspace.validationSummary.getErrorsForProcess(process);
        let isValid = processErrors.length === 0;

        let otherProcessesHaveErrors = false; // this.props.workspace.validationSummary.numErrorProcesses > (isValid ? 0 : 1);

        this.setState({
            openProcess: process,
            processErrors: processErrors,
            otherProcessesHaveErrors: otherProcessesHaveErrors,
        });
    }

    private selectDataType(type: IType | undefined) {
        this.setState({
            droppingDataType: type === this.state.droppingDataType ? undefined : type,
            droppingProcess: undefined,
            droppingStopStep: undefined,
        });
    }

    private selectProcess(process: IProcess | undefined) {
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

    private getProcessesWithErrors(workspace: IWorkspaceState) {
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
                focusStep: undefined,
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