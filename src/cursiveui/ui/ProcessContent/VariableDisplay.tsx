import * as React from 'react';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './ProcessItem.css';
import { ValueInput } from './ValueInput';
import { DataType } from '../../state/IType';
import { isValueValid } from '../../services/DataFunctions';
import { WorkspaceDispatchContext } from '../../reducer';
import { getDescendentMidLeftPos } from '../../services/StepFunctions';
import { ICoord } from '../../state/dimensions';
import { usesOptions } from '../../services/TypeFunctions';

interface Props extends ICoord {
    name: string;
    type: DataType;
    initialValue: string | null;
    inputConnected: boolean;
    outputConnected: boolean;
    inProcessName: string;
    headerMouseDown: (mouseX: number, mouseY: number, displayX: number, displayY: number) => void;
    connectorMouseDown: (input: boolean, x: number, y: number) => void;
    connectorMouseUp: () => boolean;
}

interface State {
    width: number;
    height: number;
    initialValue: string | null;
    editingValue: string | null;
}

export class VariableDisplay extends React.PureComponent<Props, State> {
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;
    
    private root: HTMLDivElement | undefined;
    private inputConnector: HTMLDivElement | undefined;
    private outputConnector: HTMLDivElement | undefined;

    public get inputConnectorPos() {
        return getDescendentMidLeftPos(this.props, this.inputConnector!);
    }

    public get outputConnectorPos() {
        return getDescendentMidLeftPos(this.props, this.outputConnector!);
    }
    
    public get maxX() {
        return this.props.x + this.root!.offsetWidth;
    }

    public get maxY() {
        return this.props.y + this.root!.offsetHeight;
    }

    constructor(props: Props) {
        super(props);

        this.state = {
            width: 0,
            height: 0,
            initialValue: props.initialValue,
            editingValue: props.initialValue,
        };
    }

    componentDidMount() {
        this.setState({
            width: growToFitGrid(this.root!.offsetWidth),
            height: growToFitGrid(this.root!.offsetHeight),
        });
    }

    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
        if (nextProps.initialValue === prevState.initialValue || nextProps.initialValue === prevState.editingValue) {
            return null;
        }

        return {
            width: 0,
            height: 0,
            initialValue: nextProps.initialValue,
            editingValue: nextProps.initialValue,
        };
    }

    componentDidUpdate() {
        if (this.state.width < this.root!.offsetWidth) {
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

        const defaultInput = this.renderDefault();

        const inputState = this.props.inputConnected
            ? ConnectorState.Connected
            : this.state.editingValue !== null
                ? ConnectorState.Fixed
                : ConnectorState.Disconnected;

        const removeVar = () => this.context({
            type: 'remove variable',
            inProcessName: this.props.inProcessName,
            varName: this.props.name,
        });

        return (
            <div
                className="processItem processItem--var"
                style={style}
                ref={r => { if (r !== null) { this.root = r; }}}
                onMouseUp={e => { if (this.props.connectorMouseUp()) { e.stopPropagation(); }}}
            >
                <div
                    className="processItem__header"
                    onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY, this.root!.offsetLeft, this.root!.offsetTop)}
                    onDoubleClick={() => this.rename()}
                    style={colorStyle}
                >
                    <div className="processItem__name">{this.props.name}</div>
                    <div
                        className="processItem__delete"
                        onClick={removeVar}
                        title="remove this variable"
                        onMouseDown={e => e.stopPropagation()}
                    />
                </div>
                
                <div className="processItem__parameters">
                    <ParameterConnector
                        type={this.props.type}
                        state={inputState}
                        input={true}
                        onMouseDown={e => this.props.connectorMouseDown(true, e.clientX, e.clientY)}
                        onDoubleClick={() => this.unlink(true)}
                        ref={c => { if (c !== null) { this.inputConnector = c.connector; }}}
                    />
                    {defaultInput}
                    <ParameterConnector
                        type={this.props.type}
                        state={this.props.outputConnected ? ConnectorState.Connected : ConnectorState.Disconnected}
                        input={false}
                        onMouseDown={e => this.props.connectorMouseDown(false, e.clientX, e.clientY)}
                        onDoubleClick={() => this.unlink(false)}
                        ref={c => { if (c !== null) { this.outputConnector = c.connector; }}}
                    />
                </div>
            </div>
        );
    }

    private renderDefault() {
        if (usesOptions(this.props.type)) {
            const valueChanged = (val: string | null) => {
                if (val === '') {
                    val = null;
                }

                this.setState({ editingValue: val });

                this.context({
                    type: 'set variable',
                    inProcessName: this.props.inProcessName,
                    varName: this.props.name,
                    initialValue: val,
                });
            };

            const strVal = this.state.editingValue === null ? '' : this.state.editingValue;

            return <select
                className="processItem__default"
                value={strVal}
                onChange={e => valueChanged(e.target.value)}
            >
                <option value="">(no default)</option>
                {this.props.type.options.map((o, i) => <option value={o} key={i}>{o}</option>)}
            </select>

        }
        else if (this.props.type.validationExpression !== undefined) {
            const strVal = this.state.editingValue === null ? '' : this.state.editingValue;

            const valueChanged = (val: string) => this.setState({ editingValue: val });

            const doneEditing = () => {
                let val = this.state.editingValue;

                if (val !== null) {
                    val = val
                        .replace(/<div>/g, '\n')
                        .replace(/<\/?div>/g, '')
                        .replace(/<br ?\/?>/g, '\n')
                        .trim();
                        
                    if (val.length === 0) {
                        val = null;
                    }
                }
                
                this.context({
                    type: 'set variable',
                    inProcessName: this.props.inProcessName,
                    varName: this.props.name,
                    initialValue: val,
                });
            };
            
            const isValid = isValueValid(this.state.editingValue, this.props.type.validationExpression);

            return <ValueInput
                className="processItem__default"
                value={strVal}
                valueChanged={valueChanged}
                doneEditing={doneEditing}
                isValid={isValid}
            />
        }
    }

    public scrollIntoView() {
        this.root!.scrollIntoView({ behavior: 'smooth' });
    }

    private unlink(input: boolean) {
        this.context({
            type: 'unlink variable',
            inProcessName: this.props.inProcessName,
            varName: this.props.name,
            varInput: input,
        });
    }

    private rename() {
        const newName = prompt('Enter a new name for this variable', this.props.name);
        if (newName === null) {
            return;
        }

        this.context({
            type: 'rename variable',
            inProcessName: this.props.inProcessName,
            oldName: this.props.name,
            newName: newName.trim(),
        });
    }
}