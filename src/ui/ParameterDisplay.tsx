import * as React from 'react';
import { Parameter } from '../data';
import './ParameterDisplay.css';

interface ParameterDisplayProps {
    parameter: Parameter;
    input: boolean;
    linkMouseDown?: () => void;
    linkMouseUp?: () => void;
}

export class ParameterDisplay extends React.PureComponent<ParameterDisplayProps, {}> {
    private _connector: HTMLDivElement;
    public get connector() { return this._connector; }

    render() {
        return (
            <div className={this.determineRootClasses()}>
                <div
                    className="parameter__icon"
                    style={{'color': this.props.parameter.type.color}}
                    onMouseDown={this.props.linkMouseDown}
                    onMouseUp={this.props.linkMouseUp}
                    ref={c => { if (c !== null) { this._connector = c; }}}
                />
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
 
        let classes = 'parameter__fixedValueInput';
        if (val !== null && val.length > 0 && !this.props.parameter.type.isValid(val)) {
            classes += ' parameter__fixedValueInput--invalid';
        }
        if (val === null) {
            val = '';
        }

        return (
            <div className="parameter__fixedValue">
                <input className={classes} onChange={e => this.fixedValChanged(e)} value={val} size={1} />
                <div className="parameter__fixedValueMeasure">{val}</div>
            </div>
        );
    }

    private fixedValChanged(e: React.ChangeEvent<HTMLInputElement>) {
        this.props.parameter.initialValue = e.target.value.length > 0 ? e.target.value : null;
        this.forceUpdate();
    }
}