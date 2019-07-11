import * as React from 'react';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './ProcessItem.css';
import { ValueInput } from './ValueInput';
import { IType } from '../../workspaceState/IType';
import { IPositionable } from '../../workspaceState/IPositionable';

interface Props extends IPositionable {
    name: string;
    type: IType;
    initialValue: string | null;
    initialValueChanged: (val: string | null) => void;
    headerMouseDown: (mouseX: number, mouseY: number) => void;
    connectorMouseDown: (input: boolean, x: number, y: number) => void;
    connectorMouseUp: (input: boolean) => void;
    deleteClicked: () => void;
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
            initialValue: props.initialValue,
        };
    }

    componentDidMount() {
        this.setState({
            width: growToFitGrid(this.root!.offsetWidth),
            height: growToFitGrid(this.root!.offsetHeight),
        });
    }

    componentWillReceiveProps(newProps: Props) {
        if (newProps.initialValue !== this.state.initialValue) {
            const widthIncreased = newProps.initialValue !== null
                && (this.state.initialValue === null || newProps.initialValue.length >= this.state.initialValue.length);

            this.setState({
                width: widthIncreased
                    ? growToFitGrid(this.root!.offsetWidth)
                    : 0,
                height: widthIncreased
                    ? growToFitGrid(this.root!.offsetHeight)
                    : 0,
                initialValue: newProps.initialValue,
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

        const numOutputs = this.props.variable.links.filter(p => p.input).length;
        const numInputs = this.props.variable.links.length - numOutputs;

        let defaultInput;
        if (this.props.type.allowInput) {
            const strVal = this.props.initialValue === null ? '' : this.props.initialValue;
            const valChanged = (val: string) => this.props.initialValueChanged(val === '' ? null : val);

            defaultInput = <ValueInput
                className="processItem__default"
                value={strVal}
                valueChanged={val => valChanged(val)}
                isValid={this.props.initialValue === null ? true : this.props.type.isValid(this.props.initialValue)}
            />
        }

        const inputState = numInputs > 0
            ? ConnectorState.Connected
            : this.props.initialValue !== null
                ? ConnectorState.Fixed
                : ConnectorState.Disconnected;

        return (
            <div className="processItem processItem--var" style={style} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="processItem__header"
                    onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY)}
                    style={colorStyle}
                >
                    <div className="processItem__name">{this.props.name}</div>
                    <div className="processItem__delete" onClick={() => this.props.deleteClicked!()} title="remove this variable" />
                </div>
                
                <div className="processItem__parameters">
                    <ParameterConnector
                        type={this.props.type}
                        state={inputState}
                        input={true}
                        onMouseDown={e => this.props.connectorMouseDown(true, e.clientX, e.clientY)}
                        onMouseUp={() => this.props.connectorMouseUp(true)}
                        ref={c => { if (c !== null) { this._inputConnector = c.connector; }}}
                    />
                    {defaultInput}
                    <ParameterConnector
                        type={this.props.type}
                        state={numOutputs === 0 ? ConnectorState.Disconnected : ConnectorState.Connected}
                        input={false}
                        onMouseDown={e => this.props.connectorMouseDown(false, e.clientX, e.clientY)}
                        onMouseUp={() => this.props.connectorMouseUp(false)}
                        ref={c => { if (c !== null) { this._outputConnector = c.connector; }}}
                    />
                </div>
            </div>
        );
    }
}