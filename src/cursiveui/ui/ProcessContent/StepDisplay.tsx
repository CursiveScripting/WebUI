import * as React from 'react';
import { growToFitGrid } from './gridSize';
import { ParameterDisplay } from './ParameterDisplay';
import './ProcessItem.css';
import { StepType } from '../../workspaceState/IStep';
import { IParameter } from '../../workspaceState/IParameter';
import { ConnectorState } from './ParameterConnector';

interface StepDisplayProps {
    stepId: string;
    displayName: string;
    description: string;
    stepType: StepType;
    inputs?: IParameter[];
    outputs?: IParameter[];
    returnPaths: string[] | null;
    x: number;
    y: number;

    readonly: boolean;
    isValid: boolean;
    focused: boolean;
    focusParameter?: IParameter;
    focusReturnPath?: string | null;
    headerMouseDown: (mouseX: number, mouseY: number) => void;
    inputLinkMouseDown: (x: number, y: number) => void;
    outputLinkMouseDown: (x: number, y: number, returnPath: string | null) => void;
    inputLinkMouseUp: () => void;
    outputLinkMouseUp: (returnPath: string | null) => void;
    parameterLinkMouseDown: (x: number, y: number, param: IParameter, input: boolean) => void;
    parameterLinkMouseUp: (param: IParameter, input: boolean) => void;
    canDelete: boolean;
}

interface StepDisplayState {
    width?: number;
}

export class StepDisplay extends React.PureComponent<StepDisplayProps, StepDisplayState> {
    private root: HTMLDivElement | undefined;
    private _entryConnector: HTMLDivElement | null = null;
    private _returnConnectors: { [key: string]: HTMLDivElement } = {};
    private _inputConnectors: HTMLDivElement[] = [];
    private _outputConnectors: HTMLDivElement[] = [];

    constructor(props: StepDisplayProps) {
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

    public getInputConnector(param: IParameter) {
        if (this.props.inputs === undefined) {
            return undefined;
        }

        const index = this.props.inputs.indexOf(param);
        if (index === -1) {
            return undefined;
        }

        return this._inputConnectors[index];
    }

    public getOutputConnector(param: IParameter) {
        if (this.props.outputs === undefined) {
            return undefined;
        }

        const index = this.props.outputs.indexOf(param);
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

    componentDidUpdate(prevProps: StepDisplayProps, prevState: StepDisplayState) {
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
            ? <div className="processItem__delete" onClick={() => this.props.deleteClicked!()} title="remove this step" />
            : undefined

        return (
            <div className={this.determineRootClasses()} style={posStyle} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="processItem__header"
                    title={this.props.description}
                    onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY)}
                >
                    <div className="processItem__icon" />
                    <div className="processItem__name">{this.props.displayName}</div>
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

        let conClasses = this.props.step.incomingPaths.length === 0
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
        let pathIdentifiers = this.props.returnPathNames;
        if (pathIdentifiers === null) {
            if (this.props.stepType === StepType.Stop) {
                let pathName = (this.props.step as StopStep).returnPath;
                if (pathName !== null) {
                    let classes = 'processItem__returnPathName';
                    if (this.props.focused && this.props.focusParameter === undefined) {
                        classes += ' processItem__returnPathName--focused';
                    }
                    return <div className={classes}>{pathName}</div>;
                }
            }

            return undefined;
        }
        if (pathIdentifiers.length === 0) {
            pathIdentifiers = [''];
        }

        this._returnConnectors = {};

        let connectors = pathIdentifiers.map((identifier, index) => {
            let pathName = identifier === '' ? null : identifier;
            let hasConnectedPath = this.props.step.returnPaths.filter(p => p.name === pathName).length === 0;
            let classes = hasConnectedPath
                ? 'processItem__connector processItem__connector--out processItem__connector--connected'
                : 'processItem__connector processItem__connector--out';
            
            if (this.props.focused && this.props.focusReturnPath === pathName) {
                classes += ' processItem__connector--focused';
            }

            return (
                <div
                    key={index}
                    className={classes}
                    onMouseDown={e => this.props.outputLinkMouseDown(e.clientX, e.clientY, pathName)}
                    onMouseUp={() => this.props.outputLinkMouseUp(pathName)}
                    ref={c => { if (c !== null) { this._returnConnectors[identifier] = c; }}}
                >
                    {identifier}
                </div>
            );
        });

        return (
            <div className="processItem__outConnectors">
                {connectors}
            </div>
        );
    }

    private renderParameters(parameters: IParameter[] | undefined, input: boolean) {
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
                    const connectorState = ConnectorState.Connected; // TODO: determine this

                    return (
                    <ParameterDisplay
                        key={idx}
                        ref={c => { if (c !== null) { connectors.push(c.connector); }}}
                        input={input}
                        name={param.name}
                        connectorState={connectorState}
                        type={param.typeName}
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