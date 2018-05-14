import * as React from 'react';
import { UserProcess, Workspace, Type, Process, Step, Variable, StepType } from '../data';
import { ProcessContent } from './ProcessContent';
import { ProcessList } from './ProcessList';
import { ProcessToolbar } from './ProcessToolbar';
import './ProcessEditor.css';

interface ProcessEditorProps {
    workspace: Workspace;
    initialProcess?: UserProcess;
    className?: string;
    save?: (xml: string) => void;
}

interface ProcessEditorState {
    openProcess: UserProcess;
    selectedDataType?: Type;
    selectedProcess?: Process;
    selectedStopStep?: string | null;
    selectedStep?: Step;
    selectedVariable?: Variable;
}

export class ProcessEditor extends React.PureComponent<ProcessEditorProps, ProcessEditorState> {
    private processList: ProcessList;

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

        let otherProcessesHaveErrors: boolean;
        let processErrors = this.props.workspace.validationSummary.getErrors(this.state.openProcess);
        if (processErrors === null) {
            processErrors = [];
            otherProcessesHaveErrors = this.props.workspace.validationSummary.numErrorProcesses > 0;
        }
        else {
            otherProcessesHaveErrors = this.props.workspace.validationSummary.numErrorProcesses > 1;
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
                    validationSummary={this.props.workspace.validationSummary}
                    ref={list => {if (list !== null) { this.processList = list; }}}
                />
                <ProcessToolbar
                    types={this.props.workspace.types.values}
                    returnPaths={this.state.openProcess.returnPaths}
                    validationErrors={processErrors}
                    otherProcessesHaveErrors={otherProcessesHaveErrors}
                    selectedStep={this.state.selectedStep}
                    selectedVariable={this.state.selectedVariable}
                    selectedType={this.state.selectedDataType}
                    selectedStopStep={this.state.selectedStopStep}
                    className="processEditor__toolbar"
                    saveProcesses={this.props.save === undefined ? undefined : () => this.saveProcesses()}
                    selectType={type => this.selectDataType(type)}
                    selectStopStep={step => this.selectStopStep(step)}
                    removeSelectedItem={() => this.removeSelectedItem()}
                />
                <ProcessContent
                    className="processEditor__content"
                    process={this.state.openProcess}
                    dropVariableType={this.state.selectedDataType}
                    dropStep={this.state.selectedProcess}
                    dropStopStep={this.state.selectedStopStep}
                    itemDropped={() => this.dropCompleted()}
                    stepDragging={step => this.setState({ selectedStep: step })}
                    variableDragging={variable => this.setState({ selectedVariable: variable })}
                    connectionChanged={() => this.revalidateOpenProcess()}
                />
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
            selectedStopStep: undefined,
        });
    }

    private selectProcess(process: Process | undefined) {
        this.setState({
            selectedDataType: undefined,
            selectedProcess: process === this.state.selectedProcess ? undefined : process,
            selectedStopStep: undefined,
        });
    }

    private selectStopStep(pathName: string | null) {
        this.setState({
            selectedDataType: undefined,
            selectedProcess: undefined,
            selectedStopStep: this.state.selectedStopStep === pathName ? undefined : pathName,
        });
    }

    private dropCompleted() {
        this.revalidateOpenProcess();

        this.setState({
            selectedDataType: undefined,
            selectedProcess: undefined,
            selectedStopStep: undefined,
            openProcess: this.state.openProcess,
        });
    }

    private removeSelectedItem() {
        if (this.state.selectedStep !== undefined && this.state.selectedStep.stepType !== StepType.Start) {
            this.state.openProcess.removeStep(this.state.selectedStep);
            this.revalidateOpenProcess();
        }

        else if (this.state.selectedVariable !== undefined) {
            this.state.openProcess.removeVariable(this.state.selectedVariable);
            this.revalidateOpenProcess();
        }

        this.setState({
            selectedStep: undefined,
            selectedVariable: undefined,
        });
    }

    private saveProcesses() {
        if (this.props.save === undefined) {
            return;
        }

        let xml = this.props.workspace.saveProcesses();
        this.props.save(xml);
    }

    private revalidateOpenProcess() {
        let wasValid = !this.props.workspace.validationSummary.hasErrorsForProcess(this.state.openProcess);

        let isValid = this.props.workspace.validateProcess(this.state.openProcess);

        if (wasValid !== isValid) {
            this.processList.forceUpdate(); // update the process list
            // TODO: also update save button? Or should this happen automatically?
        }
    }
}