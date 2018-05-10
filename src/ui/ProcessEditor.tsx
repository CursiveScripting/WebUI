import * as React from 'react';
import { UserProcess, Workspace, Type, Process, Step, Variable, StepType } from '../data';
import { ProcessContent } from './ProcessContent';
import { ProcessList } from './ProcessList';
import { DataTypePicker } from './DataTypePicker';
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
                {this.renderToolbar()}
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

    private renderToolbar() {
        let binClasses = 'tool binTool';
        if (this.state.selectedStep !== undefined || this.state.selectedVariable !== undefined) {
            binClasses += ' binTool--active';
        }

        let saveButton;

        if (this.props.save !== undefined) {
            let saveClasses = 'tool saveTool';
            
            let click, saveTitle;
            if (this.props.workspace.isValid) {
                click = () => this.saveProcesses();
            }
            else {
                saveClasses += ' saveTool--invalid';
                saveTitle = 'You must correct all validation errors before saving';
            }

            saveButton = (
                <div className={saveClasses} onClick={click} title={saveTitle}>
                    <div className="tool__label">Click to save:</div>
                    <div className="tool__icon saveTool__icon" />
                </div>
            );
        }

        return (
            <div className="processEditor__toolbar">
                <DataTypePicker
                    types={this.props.workspace.types.values}
                    selectedType={this.state.selectedDataType}
                    typeSelected={type => this.selectDataType(type)}
                />
                <div className="tool stopStepTool">
                    <div className="tool__label">Add a stop step:</div>
                    <div className="stopStepTool__items">
                        {this.renderReturnPathSelectors()}
                    </div>
                </div>
                <div className={binClasses} onMouseUp={() => this.removeSelectedItem()}>
                    <div className="tool__label">Drag here to remove:</div>
                    <div className="tool__icon binTool__icon" />
                </div>
                {saveButton}
            </div>
        );
    }

    private renderReturnPathSelectors() {
        let paths: (string | null)[] = this.state.openProcess.returnPaths;

        if (paths.length === 0) {
            paths = [null];
        }

        return paths.map((name, idx) => {
            let classes = 'tool__icon stopStepTool__icon';
            if (name === this.state.selectedStopStep) {
                classes += ' stopStepTool__icon--active';
            }

            return (
                <div
                    className={classes}
                    key={idx}
                    onMouseDown={() => this.selectStopStep(name)}
                >
                    {name}
                </div>
            );
        });
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