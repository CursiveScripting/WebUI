import * as React from 'react';
import { Parameter, Step, StepType } from '../data';
import { ParameterDisplay } from './ParameterDisplay';
import './StepDisplay.css';

interface StepDisplayProps {
    step: Step;
    readonly: boolean;
    headerMouseDown: (mouseX: number, mouseY: number) => void;
    inputLinkMouseDown: () => void;
    outputLinkMouseDown: (returnPath: string | null) => void;
    inputLinkMouseUp: () => void;
    outputLinkMouseUp: (returnPath: string | null) => void;
    parameterLinkMouseDown: (param: Parameter) => void;
    parameterLinkMouseUp: (param: Parameter) => void;
}

export class StepDisplay extends React.PureComponent<StepDisplayProps, {}> {
    private _inputConnector: HTMLDivElement | null;
    private _outputConnectors: { [key: string]: HTMLDivElement } = {};

    public get inputConnector() { return this._inputConnector; }
    public getOutputConnector(returnPathName: string | null) {
        if (returnPathName === null) {
            returnPathName = '';
        }

        return this._outputConnectors[returnPathName];
    }

    render() {
        let posStyle = {
            left: this.props.step.x,
            top: this.props.step.y,
        };

        return (
            <div className={this.determineRootClasses()} style={posStyle}>
                <div className="step__header" onMouseDown={e => this.props.headerMouseDown(e.clientX, e.clientY)}>
                    <div className="step__icon" />
                    <div className="step__processName">{this.props.step.name}</div>
                </div>
                <div className="step__connectors">
                    {this.renderInConnector()}
                    <div className="step__betweenConnectors" />
                    {this.renderOutConnectors()}
                </div>
                <div className="step__parameters">
                    {this.renderParameters(this.props.step.inputs, true)}
                    {this.renderParameters(this.props.step.outputs, false)}
                </div>
            </div>
        );
    }

    private determineRootClasses() {
        let classes = 'step';
        if (this.props.readonly) {
            classes += 'step--readonly';
        }
        switch (this.props.step.stepType) {
            case StepType.Start:
                classes += ' step--start'; break;
            case StepType.Stop:
                classes += ' step--stop'; break;
            case StepType.SystemProcess:
                classes += ' step--system'; break;
            case StepType.UserProcess:
                classes += ' step--user'; break;
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
            ? 'step__connector step__connector--in step__connector--connected'
            : 'step__connector step__connector--in';
    
        return (
            <div
                className={conClasses}
                onMouseDown={this.props.inputLinkMouseDown}
                onMouseUp={this.props.inputLinkMouseUp}
                ref={c => this._inputConnector = c}
            />
        );
    }
    
    private renderOutConnectors() {
        let pathIdentifiers = this.props.step.returnPathNames;
        if (pathIdentifiers === null) {
            return undefined;
        }
        if (pathIdentifiers.length === 0) {
            pathIdentifiers = [''];
        }

        const connectorRefs: { [key: string]: HTMLDivElement } = {};

        let connectors = pathIdentifiers.map((identifier, index) => {
            let pathName = identifier === '' ? null : identifier;
            let hasConnectedPath = this.props.step.returnPaths.filter(p => p.name === pathName).length === 0;
            let classes = hasConnectedPath
                ? 'step__connector step__connector--out step__connector--connected'
                : 'step__connector step__connector--out';
            
            return (
                <div
                    key={index}
                    className={classes}
                    onMouseDown={() => this.props.outputLinkMouseDown(pathName)}
                    onMouseUp={() => this.props.outputLinkMouseUp(pathName)}
                    ref={c => { if (c !== null) { connectorRefs[identifier] = c; }}}
                >
                    {identifier}
                </div>
            );
        });

        this._outputConnectors = connectorRefs;

        return (
            <div className="step__outConnectors">
                {connectors}
            </div>
        );
    }

    private renderParameters(parameters: Parameter[], input: boolean) {
        if (parameters.length === 0) {
            return undefined;
        }

        return (
            <div className={input ? 'step__inputs' : 'step__outputs'}>
                {parameters.map((param, idx) => {
                    const mouseDown = this.props.parameterLinkMouseDown;
                    const mouseUp = this.props.parameterLinkMouseUp;

                    return (
                    <ParameterDisplay
                        key={idx}
                        input={input}
                        parameter={param}
                        linkMouseDown={mouseDown === undefined ? undefined : () => mouseDown(param)}
                        linkMouseUp={mouseUp === undefined ? undefined : () => mouseUp(param)}
                    />
                    );
                })}
            </div>
        );
    }
}