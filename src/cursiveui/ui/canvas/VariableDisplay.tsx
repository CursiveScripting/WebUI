import * as React from 'react';
import { Variable } from '../../data';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './VariableDisplay.css';

interface VariableDisplayProps {
    variable: Variable;
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
                    state={numInputs + numOutputs === 0 ? ConnectorState.Disconnected : ConnectorState.Connected}
                    input={true}
                    onMouseDown={() => this.props.connectorMouseDown()}
                    onMouseUp={() => this.props.connectorMouseUp()}
                    ref={c => { if (c !== null) { this._connector = c.connector; }}}
                />
            </div>
        );
    }
}