import * as React from 'react';
import { UserProcess, Workspace, Type, Process, Step, Variable, StepType, Parameter } from '../data';
import { ValidationError } from '../data/ValidationError';
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
        const errorProcesses = props.workspace.userProcesses.values.filter(val => errorProcessNames.indexOf(val.name) !== -1);

        this.state = {
            openProcess: props.initialProcess === undefined
                ? props.workspace.userProcesses.values[0]
                : props.initialProcess,
            otherProcessesHaveErrors: false,
            processErrors: [],
            processesWithErrors: errorProcesses,
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
                    selectedProcess={this.state.droppingProcess}
                    processSelected={process => this.selectProcess(process)}
                    errorProcesses={this.state.processesWithErrors}
                />
                <ProcessToolbar
                    types={this.props.workspace.types.values}
                    returnPaths={this.state.openProcess.returnPaths}
                    validationErrors={this.state.processErrors}
                    otherProcessesHaveErrors={this.state.otherProcessesHaveErrors}
                    selectedStep={this.state.draggingStep}
                    selectedVariable={this.state.draggingVariable}
                    selectedType={this.state.droppingDataType}
                    selectedStopStep={this.state.droppingStopStep}
                    className="processEditor__toolbar"
                    saveProcesses={this.props.save === undefined ? undefined : () => this.saveProcesses()}
                    focusError={error => this.focusOnError(error)}
                    selectType={type => this.selectDataType(type)}
                    selectStopStep={step => this.selectStopStep(step)}
                    removeSelectedItem={() => this.removeSelectedItem()}
                />
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

    private dropCompleted() {
        this.revalidateOpenProcess();

        this.setState({
            droppingDataType: undefined,
            droppingProcess: undefined,
            droppingStopStep: undefined,
            openProcess: this.state.openProcess,
        });
    }

    private removeSelectedItem() {
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

    private saveProcesses() {
        if (this.props.save === undefined) {
            return;
        }

        let xml = this.props.workspace.saveProcesses();
        this.props.save(xml);
    }

    private revalidateOpenProcess() {
        let wasValid = !this.props.workspace.validationSummary.hasErrorsForProcess(this.state.openProcess);
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
            if (isValid) {
                processesWithErrors.splice(processesWithErrors.indexOf(this.state.openProcess, 1));
            }
            else {
                processesWithErrors.push(this.state.openProcess);
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