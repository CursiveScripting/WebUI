import * as React from 'react';
import { Variable } from '../data';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './VariableDisplay.css';

interface VariableDisplayProps {
    variable: Variable;
    nameMouseDown: (mouseX: number, mouseY: number) => void;
    connectorMouseDown: (input: boolean) => void;
    connectorMouseUp: (input: boolean) => void;
}

interface VariableDisplayState {
    width?: number;
}

export class VariableDisplay extends React.PureComponent<VariableDisplayProps, VariableDisplayState> {
    private root: HTMLDivElement;
    private _inputConnector: HTMLDivElement;
    private _outputConnector: HTMLDivElement;

    public get inputConnector() { return this._inputConnector; }
    public get outputConnector() { return this._outputConnector; }
    
    public get maxX() {
        return this.root.offsetLeft + this.root.offsetWidth;
    }

    public get maxY() {
        return this.root.offsetTop + this.root.offsetHeight;
    }

    constructor(props: VariableDisplayProps) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.setState({
            width: growToFitGrid(this.root.offsetWidth),
        });
    }
    
    render() {
        let posStyle = {
            left: this.props.variable.x,
            top: this.props.variable.y,
            minWidth: this.state.width,
        };

        let colorStyle = {
            backgroundColor: this.props.variable.type.color,
        };

        let classes = 'variable';

        return (
            <div className={classes} style={posStyle} ref={r => { if (r !== null) { this.root = r; }}}>
                <ParameterConnector
                    className="variable__connector variable__input"
                    type={this.props.variable.type}
                    state={ConnectorState.Disconnected}
                    input={true}
                    onMouseDown={() => this.props.connectorMouseDown(true)}
                    onMouseUp={() => this.props.connectorMouseUp(true)}
                    ref={c => { if (c !== null) { this._inputConnector = c.connector; }}}
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
                    ref={c => { if (c !== null) { this._outputConnector = c.connector; }}}
                />
            </div>
        );
    }
}