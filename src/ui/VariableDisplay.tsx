import * as React from 'react';
import { Variable } from '../data';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './VariableDisplay.css';

interface VariableDisplayProps {
    variable: Variable;
    nameMouseDown: (mouseX: number, mouseY: number) => void;
    connectorMouseDown: (input: boolean) => void;
    connectorMouseUp: (input: boolean) => void;
}

export class VariableDisplay extends React.PureComponent<VariableDisplayProps, {}> {

    render() {
        let posStyle = {
            left: this.props.variable.x,
            top: this.props.variable.y,
        };

        let colorStyle = {
            backgroundColor: this.props.variable.type.color,
        };

        let classes = 'variable';

        return (
            <div className={classes} style={posStyle}>
                <ParameterConnector
                    className="variable__connector variable__input"
                    type={this.props.variable.type}
                    state={ConnectorState.Disconnected}
                    input={true}
                    onMouseDown={() => this.props.connectorMouseDown(true)}
                    onMouseUp={() => this.props.connectorMouseUp(true)}
                />
                <div
                    className="variable__name"
                    style={colorStyle}
                    onMouseDown={e => this.props.nameMouseDown(e.clientX, e.clientY)}
                >
                    {this.props.variable.name}
                </div>
                <ParameterConnector
                    className="variable__connector variable__output"
                    type={this.props.variable.type}
                    state={ConnectorState.Disconnected}
                    input={false}
                    onMouseDown={() => this.props.connectorMouseDown(false)}
                    onMouseUp={() => this.props.connectorMouseUp(false)}
                />
            </div>
        );
    }
}