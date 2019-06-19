import * as React from 'react';
import { Variable } from '../../data';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './VariableDisplay.css';
import { ValueInput } from './ValueInput';

interface Props {
    variable: Variable;
    initialValueChanged: (val: string | null) => void;
    nameMouseDown: (mouseX: number, mouseY: number) => void;
    connectorMouseDown: (input: boolean) => void;
    connectorMouseUp: (input: boolean) => void;
}

interface State {
    width: number;
    height: number;
    initialValue: string | null;
}

export class VariableDisplay extends React.PureComponent<Props, State> {
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

    constructor(props: Props) {
        super(props);
        this.state = {
            width: 0,
            height: 0,
            initialValue: props.variable.initialValue,
        };
    }

    componentDidMount() {
        this.setState({
            width: growToFitGrid(this.root!.offsetWidth),
            height: growToFitGrid(this.root!.offsetHeight),
        });
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps.variable.initialValue !== this.state.initialValue) {
            const widthIncreased = newProps.variable.initialValue !== null
                && (this.state.initialValue === null || newProps.variable.initialValue.length >= this.state.initialValue.length);

            this.setState({
                width: widthIncreased
                    ? growToFitGrid(this.root!.offsetWidth)
                    : 0,
                height: widthIncreased
                    ? growToFitGrid(this.root!.offsetHeight)
                    : 0,
                initialValue: newProps.variable.initialValue,
            });
        }
    }

    componentDidUpdate() {
        if (this.state.width === 0) {
            this.setState({
                width: growToFitGrid(this.root!.offsetWidth),
                height: growToFitGrid(this.root!.offsetHeight),
            }); 
        }
    }
    
    render() {
        const style = {
            left: this.props.variable.x,
            top: this.props.variable.y,
            minWidth: this.state.width,
            minHeight: this.state.height,
        };

        let colorStyle = {
            backgroundColor: this.props.variable.type.color,
        };

        const numOutputs = this.props.variable.links.filter(p => p.input).length;
        const numInputs = this.props.variable.links.length - numOutputs;

        const defaultInput = this.props.variable.type.allowInput
            ? <ValueInput
                className="variable__default"
                value={this.props.variable.initialValue}
                valueChanged={val => this.props.initialValueChanged(val)}
                isValid={this.props.variable.initialValue === null ? true : this.props.variable.type.isValid(this.props.variable.initialValue)}
            />
            : undefined;

        const inputState = numInputs > 0
            ? ConnectorState.Connected
            : this.props.variable.initialValue !== null
                ? ConnectorState.Fixed
                : ConnectorState.Disconnected;

        return (
            <div className="variable" style={style} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="variable__name"
                    style={colorStyle}
                    onMouseDown={e => this.props.nameMouseDown(e.clientX, e.clientY)}
                >
                    {this.props.variable.name}
                </div>
                <div className="variable__body">
                    <ParameterConnector
                        className="variable__connector variable__input"
                        type={this.props.variable.type}
                        state={inputState}
                        input={true}
                        onMouseDown={() => this.props.connectorMouseDown(true)}
                        onMouseUp={() => this.props.connectorMouseUp(true)}
                        ref={c => { if (c !== null) { this._inputConnector = c.connector; }}}
                    />
                    {defaultInput}
                    <ParameterConnector
                        className="variable__connector variable__output"
                        type={this.props.variable.type}
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