import * as React from 'react';
import { DataTypePicker, DataTypePickerProps } from './DataTypePicker';
import { StopStepTool, StopStepToolProps } from './StopStepTool';
import { BinTool, BinToolProps } from './BinTool';
import { SaveTool, SaveToolProps } from './SaveTool';
import './ProcessToolbar.css';

interface ProcessToolbarProps extends StopStepToolProps, DataTypePickerProps, BinToolProps, SaveToolProps {
    className?: string;
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
                    selectedType={this.props.selectedType}
                    selectType={type => this.props.selectType(type)}
                />
                <StopStepTool
                    returnPaths={this.props.returnPaths}
                    selectedStopStep={this.props.selectedStopStep}
                    selectStopStep={this.props.selectStopStep}
                />
                <BinTool
                    selectedStep={this.props.selectedStep}
                    selectedVariable={this.props.selectedVariable}
                    removeSelectedItem={this.props.removeSelectedItem}
                />
                <SaveTool
                    validationErrors={this.props.validationErrors}
                    saveProcesses={this.props.saveProcesses}
                    otherProcessesHaveErrors={this.props.otherProcessesHaveErrors}
                    focusError={this.props.focusError}
                />
            </div>
        );
    }
}