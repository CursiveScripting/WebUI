import * as React from 'react';
import { Parameter, Step, StepType } from '../data';
import { ParameterDisplay } from './ParameterDisplay';
import './StepDisplay.css';

interface StepDisplayProps {
    step: Step;
    readonly: boolean;
    headerMouseDown?: (mouseX: number, mouseY: number) => void;
    inputLinkMouseDown?: () => void;
    outputLinkMouseDown?: () => void;
    inputLinkMouseUp?: () => void;
    outputLinkMouseUp?: () => void;
    parameterLinkMouseDown?: (param: Parameter) => void;
    parameterLinkMouseUp?: (param: Parameter) => void;
}

export class StepDisplay extends React.PureComponent<StepDisplayProps, {}> {
    private _inputConnector: HTMLDivElement | null;
    private _outputConnector: HTMLDivElement | null;

    public get inputConnector() { return this._inputConnector; }
    public get outputConnector() { return this._inputConnector; }

    render() {
        let posStyle = {
            left: this.props.step.x,
            top: this.props.step.y,
        };

        let headerMouseDown;
        if (this.props.headerMouseDown !== undefined) {
            const startMove = this.props.headerMouseDown;
            headerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => startMove(e.clientX, e.clientY);
        }

        return (
            <div className={this.determineRootClasses()} style={posStyle}>
                <div className="step__header" onMouseDown={headerMouseDown}>
                    <div className="step__icon" />
                    <div className="step__processName">{this.props.step.name}</div>
                </div>
                <div className="step__connectors">
                    {this.renderInConnector()}
                    <div className="step__betweenConnectors" />
                    {this.renderOutConnector()}
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
    
    private renderOutConnector() {
        if (this.props.step.stepType === StepType.Stop) {
            return undefined;
        }

        let conClasses = this.props.step.returnPaths.length === 0
            ? 'step__connector step__connector--out step__connector--connected'
            : 'step__connector step__connector--out';
    
        return (
            <div
                className={conClasses}
                onMouseDown={this.props.outputLinkMouseDown}
                onMouseUp={this.props.outputLinkMouseUp}
                ref={c => this._outputConnector = c}
            />
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