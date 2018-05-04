import * as React from 'react';
import { Variable } from '../data';
import './VariableDisplay.css';

interface VariableDisplayProps {
    variable: Variable;
    mouseDown: (mouseX: number, mouseY: number) => void;
}

export class VariableDisplay extends React.PureComponent<VariableDisplayProps, {}> {

    render() {
        let posColorStyle = {
            left: this.props.variable.x,
            top: this.props.variable.y,
            backgroundColor: this.props.variable.type.color,
        };

        let classes = 'variable';

        return (
            <div
                className={classes}
                style={posColorStyle}
                onMouseDown={e => this.props.mouseDown(e.clientX, e.clientY)}
            >
                {this.props.variable.name}
            </div>
        );
    }
}