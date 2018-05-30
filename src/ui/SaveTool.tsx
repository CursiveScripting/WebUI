import * as React from 'react';
import { Step, Parameter } from '../data';
import { ValidationError } from '../data/ValidationError';
import './ValidationSummary.css';

export interface SaveToolProps {
    validationErrors: ValidationError[];
    otherProcessesHaveErrors: boolean;
    saveProcesses?: () => void;
    focusOnStep: (step: Step, parameter: Parameter | null) => void;
    clearFocus: () => void;
}

export class SaveTool extends React.PureComponent<SaveToolProps, {}> {
    render() {
        let canEverSave = this.props.saveProcesses !== undefined;

        let promptText, title, click, validationSummary;
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
                title = 'You must correct all errors before saving';
            }

            validationSummary = this.renderValidationSummary();
        }

        return (
            <div className={saveClasses} onClick={click} title={title}>
                <div className="tool__label">{promptText}</div>
                <div className="tool__icon saveTool__icon" />
                {validationSummary}
            </div>
        );
    }

    private renderValidationSummary() {
        return (
            <div className="validationSummary" title="Click to show affected step">
                {this.props.validationErrors.map((error, index) => this.renderValidationError(error, index))}
            </div>
        );
    }

    private renderValidationError(error: ValidationError, index: number) {
        const focusError = () => this.props.focusOnStep(error.step, error.parameter);
        const clearFocus = () => this.props.clearFocus();

        return (
            <div
                className="validationSummary__item"
                key={index}
                onFocus={focusError}
                onMouseOver={focusError}
                onBlur={clearFocus}
                onMouseOut={clearFocus}
            >
                {error.message}
            </div>
        );
    }
}