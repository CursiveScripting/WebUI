import * as React from 'react';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './ParameterDisplay.css';
import { IType } from '../../workspaceState/IType';

interface ParameterDisplayProps {
    name: string;
    type: IType;
    isValid: boolean;
    connectorState: ConnectorState;
    input: boolean;
    focused: boolean;
    linkMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
    linkMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
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
                    type={this.props.type}
                    input={this.props.input}
                    state={this.props.connectorState}
                    onMouseDown={this.props.linkMouseDown}
                    onMouseUp={this.props.linkMouseUp}
                    ref={c => { if (c !== null) { this._connector = c.connector; }}}
                />
                <div
                    className="parameter__name"
                    onMouseDown={this.props.linkMouseDown}
                    onMouseUp={this.props.linkMouseUp}
                >
                    {this.props.name}
                </div>
            </div>
        );
    }

    private determineRootClasses() {
        let classes = this.props.input
            ? 'parameter parameter--input'
            : 'parameter parameter--output';

        if (this.props.focused) {
            classes += ' parameter--focused';
        }

        if (!this.props.isValid) {
            classes += ' parameter--invalid';
        }

        if (this.props.connectorState === ConnectorState.Fixed) {
            classes += ' parameter--fixed';
        }

        return classes;
    }
}