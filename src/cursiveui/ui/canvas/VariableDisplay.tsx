import * as React from 'react';
import { Type, Parameter } from '../../data';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './VariableDisplay.css';
import { ValueInput } from './ValueInput';

interface Props {
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

interface State {
    width: number;
    height: number;
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
        };
    }

    componentDidMount() {
        this.setState({
            width: growToFitGrid(this.root!.offsetWidth),
            height: growToFitGrid(this.root!.offsetHeight),
        });
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps.initialValue !== this.props.initialValue) {
            const widthIncreased = newProps.initialValue !== null
                && (this.props.initialValue === null || newProps.initialValue.length >= this.props.initialValue.length);

            this.setState({
                width: widthIncreased
                    ? growToFitGrid(this.root!.offsetWidth)
                    : 0,
                height: widthIncreased
                    ? growToFitGrid(this.root!.offsetHeight)
                    : 0,
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
            left: this.props.x,
            top: this.props.y,
            minWidth: this.state.width,
            minHeight: this.state.height,
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
            <div className="variable" style={style} ref={r => { if (r !== null) { this.root = r; }}}>
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