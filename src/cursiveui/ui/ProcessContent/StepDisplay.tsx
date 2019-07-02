import * as React from 'react';
import { Parameter, Step, StepType, StopStep } from '../../data';
import { growToFitGrid } from './gridSize';
import { ParameterDisplay } from './ParameterDisplay';
import './ProcessItem.css';

interface StepDisplayProps {
    step: Step;
    readonly: boolean;
    focused: boolean;
    focusParameter?: Parameter;
    focusReturnPath?: string | null;
    headerMouseDown: (mouseX: number, mouseY: number) => void;
    inputLinkMouseDown: () => void;
    outputLinkMouseDown: (returnPath: string | null) => void;
    inputLinkMouseUp: () => void;
    outputLinkMouseUp: (returnPath: string | null) => void;
    parameterLinkMouseDown: (param: Parameter, input: boolean) => void;
    parameterLinkMouseUp: (param: Parameter, input: boolean) => void;
    deleteClicked?: () => void;
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

    public getInputConnector(param: Parameter) {
        let index = this.props.step.inputs.indexOf(param);
        return this._inputConnectors[index];
    }

    public getOutputConnector(param: Parameter) {
        let index = this.props.step.outputs.indexOf(param);
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
            left: this.props.step.x,
            top: this.props.step.y,
            minWidth: this.state.width,
        };

        const deleteStep = this.props.deleteClicked === undefined
            ? undefined
            : <div className="processItem__delete" onClick={() => this.props.deleteClicked!()} title="remove this step" />

        return (
            <div className={this.determineRootClasses()} style={posStyle} ref={r => { if (r !== null) { this.root = r; }}}>
                <div
                    className="processItem__header"
                    title={this.props.step.description}
                    onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY)}
                >
                    <div className="processItem__icon" />
                    <div className="processItem__name">{this.props.step.name}</div>
                    {deleteStep}
                </div>
                <div className="processItem__connectors">
                    {this.renderInConnector()}
                    <div className="processItem__betweenConnectors" />
                    {this.renderOutConnectors()}
                </div>
                <div className="processItem__parameters">
                    {this.renderParameters(this.props.step.inputs, true)}
                    {this.renderParameters(this.props.step.outputs, false)}
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
        
        if (!this.props.step.isValid) {
            classes += ' processItem--invalid';
        }

        switch (this.props.step.stepType) {
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
        if (this.props.step.stepType === StepType.Start) {
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
                onMouseDown={this.props.inputLinkMouseDown}
                onMouseUp={this.props.inputLinkMouseUp}
                ref={c => this._entryConnector = c}
            />
        );
    }
    
    private renderOutConnectors() {
        let pathIdentifiers = this.props.step.returnPathNames;
        if (pathIdentifiers === null) {
            if (this.props.step.stepType === StepType.Stop) {
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
                    onMouseDown={() => this.props.outputLinkMouseDown(pathName)}
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

    private renderParameters(parameters: Parameter[], input: boolean) {
        let connectors: HTMLDivElement[] = [];
        if (input) {
            this._inputConnectors = connectors;
        }
        else {
            this._outputConnectors = connectors;
        }

        if (parameters.length === 0) {
            return undefined;
        }

        return (
            <div className={input ? 'processItem__inputs' : 'processItem__outputs'}>
                {parameters.map((param, idx) => {
                    return (
                    <ParameterDisplay
                        key={idx}
                        ref={c => { if (c !== null) { connectors.push(c.connector); }}}
                        input={input}
                        parameter={param}
                        focused={param === this.props.focusParameter}
                        linkMouseDown={() => this.props.parameterLinkMouseDown(param, input)}
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