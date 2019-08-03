import * as React from 'react';
import './ValidationSummary.css';
import { IValidationError } from '../../state/IValidationError';

export interface SaveToolProps {
    validationErrors: IValidationError[];
    otherProcessesHaveErrors: boolean;
    saveProcesses?: () => void;
    focusError: (error: IValidationError | undefined) => void;
}

export class SaveTool extends React.PureComponent<SaveToolProps, {}> {
    render() {
        let canEverSave = this.props.saveProcesses !== undefined;

        let promptText, title, click, validationSummary;
        let saveClasses = 'tool tool--save';

        if (this.props.validationErrors.length === 0) {
            if (this.props.otherProcessesHaveErrors) {
                saveClasses += ' tool--otherInvalid';
                promptText = `Error(s) in other process(es)${canEverSave ? ', can\'t save' : ''}`;
                title = 'You must correct all processes before saving';
            }
            else if (canEverSave) {
                promptText = 'Click to save:';
                click = this.props.saveProcesses;
            }
        }
        else {
            saveClasses += ' tool--invalid';
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
                <div className="tool__icon" />
                {validationSummary}
            </div>
        );
    }

    private renderValidationSummary() {
        return (
            <div className="validationSummary" title="">
                {this.props.validationErrors.map((error, index) => this.renderValidationError(error, index))}
            </div>
        );
    }

    private renderValidationError(error: IValidationError, index: number) {
        const focusError = () => this.props.focusError(error);
        const clearFocus = () => this.props.focusError(undefined);

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