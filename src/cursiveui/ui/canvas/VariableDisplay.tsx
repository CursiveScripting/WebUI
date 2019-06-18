import * as React from 'react';
import { Type, Parameter } from '../../data';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './VariableDisplay.css';
import { ValueInput } from './ValueInput';

interface VariableDisplayProps {
    name: string;
    type: Type;
    x: number;
    y: number;
    links: Parameter[];
    initialValue: string | null;
    initialValueChanged: (val: string | null) => void;
    nameMouseDown: (mouseX: number, mouseY: number) => void;
    connectorMouseDown: (input: boolean) => void;
    connectorMouseUp: (input: boolean) => void;
}

interface VariableDisplayState {
    width?: number;
}

export class VariableDisplay extends React.PureComponent<VariableDisplayProps, VariableDisplayState> {
    private root: HTMLDivElement | undefined;
    private _inputConnector: HTMLDivElement | undefined;
    private _outputConnector: HTMLDivElement | undefined;

    public get inputConnector() { return this._inputConnector!; }
    public get outputConnector() { return this._outputConnector!; }
    
    public get maxX() {
        return this.root!.offsetLeft + this.root!.offsetWidth;
    }

    public get maxY() {
        return this.root!.offsetTop + this.root!.offsetHeight;
    }

    constructor(props: VariableDisplayProps) {
        super(props);
        this.state = {};
    }

    componentDidMount() {
        this.setState({
            width: growToFitGrid(this.root!.offsetWidth),
        });
    }
    
    render() {
        let posStyle = {
            left: this.props.x,
            top: this.props.y,
            minWidth: this.state.width,
        };

        let colorStyle = {
            backgroundColor: this.props.type.color,
        };

        const numOutputs = this.props.links.filter(p => p.input).length;
        const numInputs = this.props.links.length - numOutputs;

        const defaultInput = this.props.type.allowInput
            ? <ValueInput
                className="variable__default"
                value={this.props.initialValue}
                valueChanged={val => this.props.initialValueChanged(val)}
                isValid={this.props.initialValue === null ? true : this.props.type.isValid(this.props.initialValue)}
            />
            : undefined;

        const inputState = numInputs > 0
            ? ConnectorState.Connected
            : this.props.initialValue !== null
                ? ConnectorState.Fixed
                : ConnectorState.Disconnected;

        return (
            <div className="variable" style={posStyle} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="variable__name"
                    style={colorStyle}
                    onMouseDown={e => this.props.nameMouseDown(e.clientX, e.clientY)}
                >
                    {this.props.name}
                </div>
                <div className="variable__body">
                    <ParameterConnector
                        className="variable__connector variable__input"
                        type={this.props.type}
                        state={inputState}
                        input={true}
                        onMouseDown={() => this.props.connectorMouseDown(true)}
                        onMouseUp={() => this.props.connectorMouseUp(true)}
                        ref={c => { if (c !== null) { this._inputConnector = c.connector; }}}
                    />
                    {defaultInput}
                    <ParameterConnector
                        className="variable__connector variable__output"
                        type={this.props.type}
                        state={numOutputs === 0 ? ConnectorState.Disconnected : ConnectorState.Connected}
                        input={false}
                        onMouseDown={() => this.props.connectorMouseDown(false)}
                        onMouseUp={() => this.props.connectorMouseUp(false)}
                        ref={c => { if (c !== null) { this._outputConnector = c.connector; }}}
                    />
                </div>
            </div>
        );
    }
}