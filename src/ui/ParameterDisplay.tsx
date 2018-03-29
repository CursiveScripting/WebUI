import * as React from 'react';
import { Parameter } from '../data';
import './ParameterDisplay.css';

interface ParameterDisplayProps {
    parameter: Parameter;
    connected: boolean;
    fixedValue?: string;
    input: boolean;
}

export class ParameterDisplay extends React.PureComponent<ParameterDisplayProps, {}> {
    render() {
        const parameter = this.props.parameter;

        let classes = this.props.input ? 'parameter parameter--input' : 'parameter parameter--output';
        if (this.props.connected) {
            classes += ' parameter--connected';
        }
        else if (this.props.fixedValue !== undefined) {
            classes += ' parameter--fixed';
        }

        let fixedValue;
        if (this.props.input && parameter.type.allowInput && !this.props.connected) {
            let val = this.props.fixedValue;
            let valClasses = 'parameter__fixedValue';
            if (val !== undefined && val.length > 0 && parameter.type.isValid(val)) {
                valClasses += ' parameter__fixedValue--invalid';
            }
            fixedValue = <div className={valClasses} contentEditable={true}>{val}</div>;
        }

        return (
            <div className={classes}>
                <div className="parameter__icon" style={{'color': parameter.type.color}} />
                <div className="parameter__name">
                    {parameter.name}
                </div>
                {fixedValue}
            </div>
        );
    }
}