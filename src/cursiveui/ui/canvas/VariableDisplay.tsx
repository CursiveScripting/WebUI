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
            left: this.props.x,
            top: this.props.y,
            minWidth: this.state.width,
        };

        let colorStyle = {
            backgroundColor: this.props.type.color,
        };

        let classes = 'variable';

        if (this.props.type.allowInput) {
            classes += ' variable--initialValue';
        }

        const numInputs = this.props.links.filter(p => !p.input).length;

        const defaultInput = this.props.type.allowInput
            ? <ValueInput
                className="variable__default"
                value={this.props.initialValue}
                valueChanged={val => this.props.initialValueChanged(val)}
                isValid={this.props.initialValue === null ? true : this.props.type.isValid(this.props.initialValue)}
            />
            : undefined;

        return (
            <div className={classes} style={posStyle} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="variable__name"
                    style={colorStyle}
                    onMouseDown={e => this.props.nameMouseDown(e.clientX, e.clientY)}
                >
                    {this.props.name}
                </div>
                <ParameterConnector
                    className="variable__connector"
                    type={this.props.type}
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