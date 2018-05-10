import * as React from 'react';
import { DataTypePicker } from './DataTypePicker';
import { Type, Step, Variable } from '../data';
import { ValidationError } from '../data/ValidationError';
import './ProcessToolbar.css';

interface ProcessToolbarProps {
    types: Type[];
    returnPaths: (string | null)[];
    validationErrors: ValidationError[];
    selectedStep?: Step;
    selectedVariable?: Variable;
    selectedDataType?: Type;
    selectedStopStep?: string | null;
    className?: string;

    saveProcesses: () => void;
    selectDataType: (type: Type) => void;
    selectStopStep: (name: string | null) => void;
    removeSelectedItem: () => void;
    save?: (xml: string) => void; // TODO: save from WORKSPACE toolbar, not process one
}

export class ProcessToolbar extends React.PureComponent<ProcessToolbarProps, {}> {
    render() {
        let binClasses = 'tool binTool';
        if (this.props.selectedStep !== undefined || this.props.selectedVariable !== undefined) {
            binClasses += ' binTool--active';
        }

        let saveButton;

        if (this.props.save !== undefined) {
            let saveClasses = 'tool saveTool';
            
            let click, saveTitle;
            if (this.props.validationErrors.length === 0) {
                click = this.props.saveProcesses;
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
                <div className={binClasses} onMouseUp={() => this.props.removeSelectedItem()}>
                    <div className="tool__label">Drag here to remove:</div>
                    <div className="tool__icon binTool__icon" />
                </div>
                {saveButton}
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
}