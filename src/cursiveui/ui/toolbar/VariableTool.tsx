import * as React from 'react';
import './VariableSelector.css';
import { Tool, ToolState } from './Tool';
import { DataType } from '../../state/IType';

export interface VariableToolProps {
    dataTypes: DataType[];
    startDrag: (type: DataType) => void;
}

export const VariableTool: React.FunctionComponent<VariableToolProps> = props => {
    return <Tool
        className="tool--variable"
        state={ToolState.Normal}
        prompt="Add variable"
    >
        {props.dataTypes.map((type, index) => renderDataType(type, index, () => props.startDrag(type)))}
    </Tool>
}

function renderDataType(type: DataType, index: number, startDrag: () => void) {
    return (
        <div
            className="variableSelector"
            key={index}
            onMouseDown={startDrag}
        >
            <div className="variableSelector__swatch" style={{backgroundColor: type.color}} />
            {type.name}
        </div>
    );
}