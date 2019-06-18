import * as React from 'react';
import { Variable } from '../../data';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './VariableDisplay.css';
import { ValueInput } from './ValueInput';

interface VariableDisplayProps {
    variable: Variable;
    defaultChanged: (val: string | null) => void;
    nameMouseDown: (mouseX: number, mouseY: number) => void;
    connectorMouseDown: () => void;
    connectorMouseUp: () => void;
}

interface VariableDisplayState {
    width?: number;
}

export class VariableDisplay extends React.PureComponent<VariableDisplayProps, VariableDisplayState> {
    private root: HTMLDivElement | undefined;
    private _connector: HTMLDivElement | undefined;

    public get connector() { return this._connector!; }
    
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
            left: this.props.variable.x,
            top: this.props.variable.y,
            minWidth: this.state.width,
        };

        let colorStyle = {
            backgroundColor: this.props.variable.type.color,
        };

        let classes = 'variable';

        const numLinks = this.props.variable.links.length;
        const numOutputs = this.props.variable.links.filter(p => p.input).length;
        const numInputs = numLinks - numOutputs;

        const defaultInput = this.props.variable.type.allowInput
            ? <ValueInput
                className="variable__default"
                value={this.props.variable.initialValue}
                valueChanged={val => this.props.defaultChanged(val)}
                isValid={this.props.variable.initialValue === null ? true : this.props.variable.type.isValid(this.props.variable.initialValue)}
            />
            : undefined;

        return (
            <div className={classes} style={posStyle} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="variable__name"
                    style={colorStyle}
                    onMouseDown={e => this.props.nameMouseDown(e.clientX, e.clientY)}
                >
                    {this.props.variable.name}
                </div>
                <ParameterConnector
                    className="variable__connector"
                    type={this.props.variable.type}
                    state={numInputs === 0 ? ConnectorState.Disconnected : ConnectorState.Connected}
                    input={true}
                    onMouseDown={() => this.props.connectorMouseDown()}
                    onMouseUp={() => this.props.connectorMouseUp()}
                    ref={c => { if (c !== null) { this._connector = c.connector; }}}
                />
                {defaultInput}
            </div>
        );
    }
}