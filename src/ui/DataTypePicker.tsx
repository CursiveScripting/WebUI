import * as React from 'react';
import { Type } from '../data';
import './DataTypePicker.css';

export interface DataTypePickerProps {
    types: Type[];
    selectedType?: Type;
    selectType: (type: Type) => void;
}

export class DataTypePicker extends React.PureComponent<DataTypePickerProps, {}> {
    render() {
        if (this.props.types.length === 0) {
            return null;
        }

        return (
            <div className="dataTypePicker tool">
                <div className="tool__intro">Add a new variable:</div>
                <div className="dataTypePicker__items">
                    {this.props.types.map((type, index) => this.renderType(type, index))}
                </div>
            </div>
        );
    }

    private renderType(type: Type, index: number) {
        let classes = 'dataTypePicker__item';
        if (type.allowInput) {
            classes += ' dataTypePicker__item--canInput';
        }
        if (type === this.props.selectedType) {
            classes += ' dataTypePicker__item--selected';
        }

        return (
            <div
                className={classes}
                key={index}
                style={{backgroundColor: type.color, borderColor: type.color}}
                title={type.guidance}
                onMouseDown={() => this.props.selectType(type)}
            >
                {type.name}
            </div>
        );
    }
}