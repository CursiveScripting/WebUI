import * as React from 'react';
import './ValidationSummary.css';
import { IValidationError } from '../../state/IValidationError';
import { Tool, ToolState } from './Tool';

export interface SaveToolProps {
    validationErrors: IValidationError[];
    otherProcessesHaveErrors: boolean;
    saveProcesses?: () => void;
    focusError: (error: IValidationError | undefined) => void;
}

export const SaveTool: React.FunctionComponent<SaveToolProps> = props => {
    let state, prompt, validationSummary;

    if (props.validationErrors.length === 0) {
        if (props.otherProcessesHaveErrors) {
            state = ToolState.Error;
            prompt = 'Error(s) in other process(es), can\'t save';
        }
        else if (props.saveProcesses === undefined) {
            state = ToolState.Disabled;
            prompt = 'All changes saved';
        }
        else {
            state = ToolState.Normal;
            prompt = 'Click to save:';
        }
    }
    else {
        state = ToolState.Error;
        prompt = `${props.validationErrors.length} error${(props.validationErrors.length === 1 ? '' : 's')} in this process`;

        validationSummary = props.validationErrors.map((error, index) => renderValidationError(error, index, props.focusError));
    }

    return <Tool
        className="tool--save"
        state={state}
        prompt={prompt}
        onClick={props.saveProcesses}
    >
        {validationSummary}
    </Tool>
}

function renderValidationError(error: IValidationError, index: number, setFocus: (focus: IValidationError | undefined) => void) {
    const focusError = () => setFocus(error);
    const clearFocus = () => setFocus(undefined);

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