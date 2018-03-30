import * as React from 'react';
import { Step, StepType } from '../data';
import { ParameterDisplay } from './ParameterDisplay';
import './StepDisplay.css';

interface StepDisplayProps {
    step: Step;
    readonly: boolean;
    headerMouseDown?: (mouseX: number, mouseY: number) => void;
}

export class StepDisplay extends React.PureComponent<StepDisplayProps, {}> {
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
                    {this.renderInputs()}
                    {this.renderOutputs()}
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
        
        return <div className={conClasses} />;
    }
    
    private renderOutConnector() {
        if (this.props.step.stepType === StepType.Stop) {
            return undefined;
        }

        let conClasses = this.props.step.returnPaths.length === 0
            ? 'step__connector step__connector--out step__connector--connected'
            : 'step__connector step__connector--out';
        
        return <div className={conClasses} />;
    }

    private renderInputs() {
        if (this.props.step.inputs.length === 0) {
            return undefined;
        }

        return (
            <div className="step__inputs">
                {this.props.step.inputs.map((param, idx) => (
                    <ParameterDisplay
                        key={idx}
                        input={true}
                        parameter={param}
                    />
                ))}
            </div>
        );
    }

    private renderOutputs() {
        if (this.props.step.outputs.length === 0) {
            return undefined;
        }

        return (
            <div className="step__outputs">
                {this.props.step.outputs.map((param, idx) => (
                    <ParameterDisplay
                        key={idx}
                        input={false}
                        parameter={param}
                    />
                ))}
            </div>
        );
    }
}