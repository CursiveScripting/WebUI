import * as React from 'react';
import { ValidationError } from '../data/ValidationError';

export interface SaveToolProps {
    validationErrors: ValidationError[];
    otherProcessesHaveErrors: boolean;
    saveProcesses?: () => void;
}

export class SaveTool extends React.PureComponent<SaveToolProps, {}> {
    render() {
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