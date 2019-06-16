import * as React from 'react';
import { DataTypePicker, DataTypePickerProps } from './DataTypePicker';
import { BinTool, BinToolProps } from './BinTool';
import { SaveTool, SaveToolProps } from './SaveTool';
import './ProcessToolbar.css';

interface ProcessToolbarProps extends DataTypePickerProps, BinToolProps, SaveToolProps {
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