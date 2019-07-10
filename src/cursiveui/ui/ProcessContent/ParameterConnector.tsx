import * as React from 'react';
import { IType } from '../../workspaceState/IType';
import './ParameterConnector.css';

export enum ConnectorState {
    Disconnected,
    Fixed,
    Connected,
}

interface ParameterConnectorProps {
    type: IType;
    state: ConnectorState;
    input: boolean;
    className?: string;
    onMouseDown?: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export class ParameterConnector extends React.PureComponent<ParameterConnectorProps, {}> {
    private _connector: HTMLDivElement | undefined;
    public get connector() { return this._connector!; }

    render() {
        return (
            <div
                className={this.determineRootClasses()}
                style={{'color': this.props.type.color}}
                onMouseDown={this.props.onMouseDown}
                onMouseUp={this.props.onMouseUp}
                ref={c => { if (c !== null) { this._connector = c; }}}
            />
        );
    }
    
    private determineRootClasses() {
        let classes = 'connector';
        if (this.props.state === ConnectorState.Connected) {
            classes += ' connector--connected';
        }
        else if (this.props.state === ConnectorState.Fixed) {
            classes += ' connector--fixed';
        }

        classes += this.props.input ? ' connector--input' : ' connector--output';

        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        return classes;
    }
}