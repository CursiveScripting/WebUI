import * as React from 'react';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './ProcessItem.css';
import { ValueInput } from './ValueInput';
import { IType } from '../../workspaceState/IType';
import { IPositionable } from '../../workspaceState/IPositionable';
import { useMemo } from 'react';
import { isValueValid } from '../../services/DataFunctions';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';

interface Props extends IPositionable {
    name: string;
    type: IType;
    initialValue: string | null;
    inputConnected: boolean;
    outputConnected: boolean;
    canEdit: boolean;
    focused: boolean;
    inProcessName: string;
    headerMouseDown: (mouseX: number, mouseY: number) => void;
    connectorMouseDown: (input: boolean) => void;
    connectorMouseUp: (input: boolean) => void;
}

interface State {
    width: number;
    height: number;
    initialValue: string | null;
}

export class VariableDisplay extends React.PureComponent<Props, State> {
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;
    
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
        let rootClasses = 'processItem processItem--var';

        if (this.props.focused) {
            rootClasses += ' processItem--focused';
        }

        const style = {
            left: this.props.x,
            top: this.props.y,
            minWidth: this.state.width,
            minHeight: this.state.height,
        };

        let colorStyle = {
            backgroundColor: this.props.type.color,
        };

        let defaultInput;
        if (this.props.canEdit) {
            const strVal = this.props.initialValue === null ? '' : this.props.initialValue;
            const valChanged = (val: string) => this.context({
                type: 'set variable',
                inProcessName: this.props.inProcessName,
                varName: this.props.name,
                initialValue: val === '' ? null : val,
            });

            const isValid = useMemo(
                () => isValueValid(this.props.initialValue, this.props.type.validationExpression),
                [this.props.initialValue, this.props.type.validationExpression]
            );

            defaultInput = <ValueInput
                className="processItem__default"
                value={strVal}
                valueChanged={val => valChanged(val)}
                isValid={isValid}
            />
        }

        const inputState = this.props.inputConnected
            ? ConnectorState.Connected
            : this.props.initialValue !== null
                ? ConnectorState.Fixed
                : ConnectorState.Disconnected;

        const removeVar = () => this.context({
            type: 'remove variable',
            inProcessName: this.props.inProcessName,
            varName: this.props.name,
        });

        return (
            <div className={rootClasses} style={style} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="processItem__header"
                    onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY)}
                    style={colorStyle}
                >
                    <div className="processItem__name">{this.props.name}</div>
                    <div className="processItem__delete" onClick={removeVar} title="remove this variable" />
                </div>
                
                <div className="processItem__parameters">
                    <ParameterConnector
                        type={this.props.type}
                        state={inputState}
                        input={true}
                        onMouseDown={e => this.props.connectorMouseDown(true)}
                        onMouseUp={() => this.props.connectorMouseUp(true)}
                        ref={c => { if (c !== null) { this._inputConnector = c.connector; }}}
                    />
                    {defaultInput}
                    <ParameterConnector
                        type={this.props.type}
                        state={this.props.outputConnected ? ConnectorState.Disconnected : ConnectorState.Connected}
                        input={false}
                        onMouseDown={e => this.props.connectorMouseDown(false)}
                        onMouseUp={() => this.props.connectorMouseUp(false)}
                        ref={c => { if (c !== null) { this._outputConnector = c.connector; }}}
                    />
                </div>
            </div>
        );
    }

    public scrollIntoView() {
        this.root!.scrollIntoView({ behavior: 'smooth' });
    }
}