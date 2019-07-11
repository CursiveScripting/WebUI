import * as React from 'react';
import { growToFitGrid } from './gridSize';
import { ParameterDisplay } from './ParameterDisplay';
import './ProcessItem.css';
import { StepType } from '../../workspaceState/IStep';
import { ConnectorState } from './ParameterConnector';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { IStepDisplay, IStepDisplayParam } from './IStepDisplay';

interface Props extends IStepDisplay {
    inProcessName: string;
    readonly: boolean;
    isValid: boolean;
    focused: boolean;
    focusParameter?: IStepDisplayParam;
    focusReturnPath?: string | null;
    returnPathName?: string; // for stop steps only
    
    inputConnected: boolean;
    canDelete: boolean;

    headerMouseDown: (mouseX: number, mouseY: number) => void;
    inputLinkMouseDown: (x: number, y: number) => void;
    outputLinkMouseDown: (x: number, y: number, returnPath: string | null) => void;
    inputLinkMouseUp: () => void;
    outputLinkMouseUp: (returnPath: string | null) => void;
    parameterLinkMouseDown: (x: number, y: number, param: IStepDisplayParam, input: boolean) => void;
    parameterLinkMouseUp: (param: IStepDisplayParam, input: boolean) => void;
}

interface StepDisplayState {
    width?: number;
}

export class StepDisplay extends React.PureComponent<Props, StepDisplayState> {
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;

    private root: HTMLDivElement | undefined;
    private _entryConnector: HTMLDivElement | null = null;
    private _returnConnectors: { [key: string]: HTMLDivElement } = {};
    private _inputConnectors: HTMLDivElement[] = [];
    private _outputConnectors: HTMLDivElement[] = [];

    constructor(props: Props) {
        super(props);
        this.state = {};
    }
    
    public get entryConnector() { return this._entryConnector!; }
    public getReturnConnector(returnPathName: string | null) {
        if (returnPathName === null) {
            returnPathName = '';
        }

        return this._returnConnectors[returnPathName];
    }

    public getInputConnector(paramName: string) {
        if (this.props.inputs === undefined) {
            return undefined;
        }

        const index = this.props.inputs.findIndex(p => p.name === paramName);
        if (index === -1) {
            return undefined;
        }

        return this._inputConnectors[index];
    }

    public getOutputConnector(paramName: string) {
        if (this.props.outputs === undefined) {
            return undefined;
        }

        const index = this.props.outputs.findIndex(p => p.name === paramName);
        if (index === -1) {
            return undefined;
        }

        return this._outputConnectors[index];
    }

    public get maxX() {
        return this.root!.offsetLeft + this.root!.offsetWidth;
    }

    public get maxY() {
        return this.root!.offsetTop + this.root!.offsetHeight;
    }

    public get bounds() {
        return this.root!.getBoundingClientRect();
    }

    componentDidMount() {
        this.updateWidth();
    }

    componentDidUpdate(prevProps: Props, prevState: StepDisplayState) {
        if (this.state.width === undefined) {
            this.updateWidth(); // if width was just cleared, now calculate it again
        }
    }

    render() {
        let posStyle = {
            left: this.props.x,
            top: this.props.y,
            minWidth: this.state.width,
        };

        const deleteStep = this.props.canDelete
            ? <div className="processItem__delete" onClick={() => this.context({
                type: 'remove step',
                processName: this.props.inProcessName,
                stepId: this.props.uniqueId,
            })} title="remove this step" />
            : undefined

        return (
            <div className={this.determineRootClasses()} style={posStyle} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="processItem__header"
                    title={this.props.description}
                    onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY)}
                >
                    <div className="processItem__icon" />
                    <div className="processItem__name">{this.props.name}</div>
                    {deleteStep}
                </div>
                <div className="processItem__connectors">
                    {this.renderInConnector()}
                    <div className="processItem__betweenConnectors" />
                    {this.renderOutConnectors()}
                </div>
                <div className="processItem__parameters">
                    {this.renderParameters(this.props.inputs, true)}
                    {this.renderParameters(this.props.outputs, false)}
                </div>
            </div>
        );
    }

    public scrollIntoView() {
        this.root!.scrollIntoView({ behavior: 'smooth' });
    }

    private determineRootClasses() {
        let classes = 'processItem';
        if (this.props.readonly) {
            classes += ' processItem--readonly';
        }

        if (this.props.focused) {
            classes += ' processItem--focused';
        }
        
        if (!this.props.isValid) {
            classes += ' processItem--invalid';
        }

        switch (this.props.stepType) {
            case StepType.Start:
                classes += ' processItem--start'; break;
            case StepType.Stop:
                classes += ' processItem--stop'; break;
            case StepType.SystemProcess:
                classes += ' processItem--system'; break;
            case StepType.UserProcess:
                classes += ' processItem--user'; break;
            default:
                break;
        }
        return classes;
    }

    private renderInConnector() {
        if (this.props.stepType === StepType.Start) {
            return undefined;
        }

        let conClasses = this.props.inputConnected
            ? 'processItem__connector processItem__connector--in processItem__connector--connected'
            : 'processItem__connector processItem__connector--in';
    
        if (this.props.focused && this.props.focusParameter === undefined && this.props.focusReturnPath === undefined) {
            // not focused on a parameter, nor a return path, so must be the input connector
            conClasses += ' processItem__connector--focused';
        }

        return (
            <div
                className={conClasses}
                onMouseDown={e => this.props.inputLinkMouseDown(e.clientX, e.clientY)}
                onMouseUp={this.props.inputLinkMouseUp}
                ref={c => this._entryConnector = c}
            />
        );
    }
    
    private renderOutConnectors() {
        if (this.props.stepType === StepType.Stop && this.props.returnPathName !== undefined) {
            let classes = 'processItem__returnPathName';
            if (this.props.focused && this.props.focusParameter === undefined) {
                classes += ' processItem__returnPathName--focused';
            }
            return <div className={classes}>{this.props.returnPathName}</div>;
        }

        this._returnConnectors = {};

        const connectors: JSX.Element[] = [];

        for (const [pathName, connectedStep] of this.props.returnPaths) {
            const actualPathName = pathName === '' ? null : pathName;
            let classes = connectedStep !== null
                ? 'processItem__connector processItem__connector--out processItem__connector--connected'
                : 'processItem__connector processItem__connector--out';
            
            if (this.props.focused && this.props.focusReturnPath === pathName) {
                classes += ' processItem__connector--focused';
            }

            connectors.push(
                <div
                    key={pathName}
                    className={classes}
                    onMouseDown={e => this.props.outputLinkMouseDown(e.clientX, e.clientY, actualPathName)}
                    onMouseUp={() => this.props.outputLinkMouseUp(actualPathName)}
                    ref={c => { if (c !== null) { this._returnConnectors[pathName] = c; }}}
                >
                    {pathName}
                </div>
            );
        };

        return (
            <div className="processItem__outConnectors">
                {connectors}
            </div>
        );
    }

    private renderParameters(parameters: IStepDisplayParam[] | undefined, input: boolean) {
        let connectors: HTMLDivElement[] = [];
        if (input) {
            this._inputConnectors = connectors;
        }
        else {
            this._outputConnectors = connectors;
        }

        if (parameters === undefined || parameters.length === 0) {
            return undefined;
        }

        return (
            <div className={input ? 'processItem__inputs' : 'processItem__outputs'}>
                {parameters.map((param, idx) => {
                    const isValid = true; // TODO: determine this
                    
                    const connectorState = param.linkedVariable === undefined
                        ? ConnectorState.Connected
                        : ConnectorState.Disconnected;

                    return (
                    <ParameterDisplay
                        key={idx}
                        ref={c => { if (c !== null) { connectors.push(c.connector); }}}
                        input={input}
                        name={param.name}
                        connectorState={connectorState}
                        type={param.type}
                        isValid={isValid}
                        focused={param === this.props.focusParameter}
                        linkMouseDown={e => this.props.parameterLinkMouseDown(e.clientX, e.clientY, param, input)}
                        linkMouseUp={() => this.props.parameterLinkMouseUp(param, input)}
                    />
                    );
                })}
            </div>
        );
    }

    private updateWidth() {
        this.setState({
            width: growToFitGrid(this.root!.offsetWidth),
        });
    }
}