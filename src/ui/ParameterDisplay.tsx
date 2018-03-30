import * as React from 'react';
import { Parameter } from '../data';
import './ParameterDisplay.css';

interface ParameterDisplayProps {
    parameter: Parameter;
    input: boolean;
}

export class ParameterDisplay extends React.PureComponent<ParameterDisplayProps, {}> {
    render() {
        return (
            <div className={this.determineRootClasses()}>
                <div className="parameter__icon" style={{'color': this.props.parameter.type.color}} />
                <div className="parameter__name">
                    {this.props.parameter.name}
                </div>
                {this.renderFixedInputValue()}
            </div>
        );
    }

    private determineRootClasses() {
        let classes = this.props.input ? 'parameter parameter--input' : 'parameter parameter--output';

        if (this.props.parameter.link !== null) {
            classes += ' parameter--connected';
        }
        else if (this.props.parameter.initialValue !== null) {
            classes += ' parameter--fixed';
        }

        return classes;
    }

    private renderFixedInputValue() {
        if (!this.props.input || !this.props.parameter.type.allowInput || this.props.parameter.link !== null) {
            return undefined;
        }

        let val = this.props.parameter.initialValue;
        
        let classes = 'parameter__fixedValue';
        if (val !== null && val.length > 0 && !this.props.parameter.type.isValid(val)) {
            classes += ' parameter__fixedValue--invalid';
        }
        if (val === null) {
            val = '';
        }

        return <div className={classes} contentEditable={true} onInput={e => this.fixedValChanged(e)}>{val}</div>;
    }

    private fixedValChanged(e: React.FormEvent<HTMLDivElement>) {
        this.props.parameter.initialValue = (e.target as HTMLDivElement).innerText;
        this.forceUpdate();
    }
}