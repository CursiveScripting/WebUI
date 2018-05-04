import * as React from 'react';
import { Type } from '../data';
import './DataTypePicker.css';

interface DataTypePickerProps {
    types: Type[];
}

export class DataTypePicker extends React.PureComponent<DataTypePickerProps, {}> {
    render() {
        return (
            <div className="dataTypePicker">
                {this.props.types.map((type, index) => this.renderType(type, index))}
            </div>
        );
    }

    private renderType(type: Type, index: number) {
        let classes = 'dataTypePicker__item';
        if (type.allowInput) {
            classes += ' dataTypePicker__item--canInput';
        }

        // TODO: allow dragging into content area, creating a variable
        return (
            <div className={classes} key={index} style={{backgroundColor: type.color}} title={type.guidance}>
                {type.name}
            </div>
        );
    }
}