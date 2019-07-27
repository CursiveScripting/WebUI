import * as React from 'react';
import { growToFitGrid } from './gridSize';
import { ParameterConnector, ConnectorState } from './ParameterConnector';
import './ProcessItem.css';
import { ValueInput } from './ValueInput';
import { IType } from '../../state/IType';
import { isValueValid } from '../../services/DataFunctions';
import { WorkspaceDispatchContext } from '../../reducer';
import { getDescendentMidLeftPos } from '../../services/StepFunctions';
import { ICoord } from '../../state/dimensions';

interface Props extends ICoord {
    name: string;
    type: IType;
    initialValue: string | null;
    inputConnected: boolean;
    outputConnected: boolean;
    canEdit: boolean;
    focused: boolean;
    inProcessName: string;
    headerMouseDown: (mouseX: number, mouseY: number, displayX: number, displayY: number) => void;
    connectorMouseDown: (input: boolean, x: number, y: number) => void;
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
            const strVal = this.state.initialValue === null ? '' : this.state.initialValue;
            const valChanged = (val: string) => this.context({
                type: 'set variable',
                inProcessName: this.props.inProcessName,
                varName: this.props.name,
                initialValue: val === '' ? null : val,
            });
            
            const isValid = isValueValid(this.state.initialValue, this.props.type.validationExpression);
            // const isValid = useMemo(
                // () => isValueValid(this.state.initialValue, this.props.type.validationExpression),
                // [this.state.initialValue, this.props.type.validationExpression]
            // );

            // TODO: only update context when done editing, not on every change.
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
                    onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY, this.root!.offsetLeft, this.root!.offsetTop)}
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
                        onMouseDown={e => this.props.connectorMouseDown(true, e.clientX, e.clientY)}
                        onMouseUp={() => this.props.connectorMouseUp(true)}
                        ref={c => { if (c !== null) { this.inputConnector = c.connector; }}}
                    />
                    {defaultInput}
                    <ParameterConnector
                        type={this.props.type}
                        state={this.props.outputConnected ? ConnectorState.Disconnected : ConnectorState.Connected}
                        input={false}
                        onMouseDown={e => this.props.connectorMouseDown(false, e.clientX, e.clientY)}
                        onMouseUp={() => this.props.connectorMouseUp(false)}
                        ref={c => { if (c !== null) { this.outputConnector = c.connector; }}}
                    />
                </div>
            </div>
        );
    }

    public scrollIntoView() {
        this.root!.scrollIntoView({ behavior: 'smooth' });
    }
}