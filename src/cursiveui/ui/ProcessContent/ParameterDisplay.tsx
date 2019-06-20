import * as React from 'react';
import { Parameter } from '../../data';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './ParameterDisplay.css';

interface ParameterDisplayProps {
    parameter: Parameter;
    input: boolean;
    focused: boolean;
    linkMouseDown?: () => void;
    linkMouseUp?: () => void;
    defaultChanged?: () => void;
}

export class ParameterDisplay extends React.PureComponent<ParameterDisplayProps, {}> {
    private _connector: HTMLDivElement | undefined;
    public get connector() { return this._connector!; }

    render() {
        return (
            <div className={this.determineRootClasses()}>
                <ParameterConnector
                    className="parameter__connector"
                    type={this.props.parameter.type}
                    input={this.props.input}
                    state={this.determineConnectorState()}
                    onMouseDown={this.props.linkMouseDown}
                    onMouseUp={this.props.linkMouseUp}
                    ref={c => { if (c !== null) { this._connector = c.connector; }}}
                />
                <div
                    className="parameter__name"
                    onMouseDown={this.props.linkMouseDown}
                    onMouseUp={this.props.linkMouseUp}
                >
                    {this.props.parameter.name}
                </div>
            </div>
        );
    }

    private determineRootClasses() {
        let classes = this.props.input ? 'parameter parameter--input' : 'parameter parameter--output';

        if (this.props.focused) {
            classes += ' parameter--focused';
        }

        if (!this.props.parameter.isValid) {
            classes += ' parameter--invalid';
        }

        if (this.props.parameter.link === null && this.props.parameter.initialValue !== null) {
            classes += ' parameter--fixed';
        }

        return classes;
    }

    private determineConnectorState() {
        if (this.props.parameter.link !== null) {
            return ConnectorState.Connected;
        }
        else if (this.props.parameter.initialValue !== null) {
            return ConnectorState.Fixed;
        }
        else {
            return ConnectorState.Disconnected;
        }
    }
}