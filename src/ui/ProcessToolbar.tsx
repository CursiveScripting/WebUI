import * as React from 'react';
import { DataTypePicker } from './DataTypePicker';
import { Type, Step, Variable } from '../data';
import { ValidationError } from '../data/ValidationError';
import './ProcessToolbar.css';

interface ProcessToolbarProps {
    types: Type[];
    returnPaths: (string | null)[];
    validationErrors: ValidationError[];
    otherProcessesHaveErrors: boolean;
    selectedStep?: Step;
    selectedVariable?: Variable;
    selectedDataType?: Type;
    selectedStopStep?: string | null;
    className?: string;

    saveProcesses?: () => void;
    selectDataType: (type: Type) => void;
    selectStopStep: (name: string | null) => void;
    removeSelectedItem: () => void;
}

export class ProcessToolbar extends React.PureComponent<ProcessToolbarProps, {}> {
    render() {
        let classes = 'processToolbar';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        return (
            <div className={classes}>
                <DataTypePicker
                    types={this.props.types}
                    selectedType={this.props.selectedDataType}
                    typeSelected={type => this.props.selectDataType(type)}
                />
                <div className="tool stopStepTool">
                    <div className="tool__label">Add a stop step:</div>
                    <div className="stopStepTool__items">
                        {this.renderReturnPathSelectors()}
                    </div>
                </div>
                {this.renderBin()}
                {this.renderSaveAndValidation()}
            </div>
        );
    }
    
    private renderReturnPathSelectors() {
        let paths = this.props.returnPaths;

        if (paths.length === 0) {
            paths = [null];
        }

        return paths.map((name, idx) => {
            let classes = 'tool__icon stopStepTool__icon';
            if (name === this.props.selectedStopStep) {
                classes += ' stopStepTool__icon--active';
            }

            return (
                <div
                    className={classes}
                    key={idx}
                    onMouseDown={() => this.props.selectStopStep(name)}
                >
                    {name}
                </div>
            );
        });
    }

    private renderBin() {
        let binClasses = 'tool binTool';
        if (this.props.selectedStep !== undefined || this.props.selectedVariable !== undefined) {
            binClasses += ' binTool--active';
        }

        return (
            <div className={binClasses} onMouseUp={() => this.props.removeSelectedItem()}>
                <div className="tool__label">Drag here to remove:</div>
                <div className="tool__icon binTool__icon" />
            </div>
        );
    }

    private renderSaveAndValidation() {
        let canEverSave = this.props.saveProcesses !== undefined;

        let promptText, title, click;
        let saveClasses = 'tool saveTool';

        if (this.props.validationErrors.length === 0) {
            if (this.props.otherProcessesHaveErrors) {
                saveClasses += ' saveTool--otherInvalid';
                promptText = `Error(s) in other process(es)${canEverSave ? ', can\'t save' : ''}`;
                title = 'You must correct all processes before saving';
            }
            else if (canEverSave) {
                promptText = 'Click to save:';
                click = this.props.saveProcesses;
            }
        }
        else {
            saveClasses += ' saveTool--invalid';
            promptText = `${this.props.validationErrors.length} error${(this.props.validationErrors.length === 1 ? '' : 's')} in this process`;
            if (canEverSave) {
                promptText += ', can\'t save';
            }
            title = 'You must correct all errors before saving';
            // TODO: display validation messages in a fold-down container
        }

        return (
            <div className={saveClasses} onClick={click} title={title}>
                <div className="tool__label">{promptText}</div>
                <div className="tool__icon saveTool__icon" />
            </div>
        );
    }
}