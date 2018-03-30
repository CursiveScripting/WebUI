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
        const step = this.props.step;
        let classes = 'step';
        if (this.props.readonly) {
            classes += 'step--readonly';
        }
        switch (step.stepType) {
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
        
        let inConnector, outConnector;
        if (step.stepType !== StepType.Start) {
            let conClasses = step.incomingPaths.length === 0
                ? 'step__connector step__connector--in step__connector--connected'
                : 'step__connector step__connector--in';
            inConnector = <div className={conClasses} />;
        }
        if (step.stepType !== StepType.Stop) {
            let conClasses = step.returnPaths.length === 0
                ? 'step__connector step__connector--out step__connector--connected'
                : 'step__connector step__connector--out';
            outConnector = <div className={conClasses} />;
        }

        let inputs = step.inputs.length === 0 ? undefined : (
            <div className="step__inputs">
                {step.inputs.map((param, idx) => (
                    <ParameterDisplay
                        key={idx}
                        input={true}
                        parameter={param}
                        connected={param.link !== null}
                        fixedValue={param.initialValue === null ? undefined : param.initialValue}
                    />
                ))}
            </div>
        );

        let outputs = step.outputs.length === 0 ? undefined : (
            <div className="step__outputs">
                {step.outputs.map((param, idx) => (
                    <ParameterDisplay
                        key={idx}
                        input={false}
                        parameter={param}
                        connected={param.link !== null}
                    />
                ))}
            </div>
        );

        let posStyle = {
            left: step.x,
            top: step.y,
        };

        let headerMouseDown;
        if (this.props.headerMouseDown !== undefined) {
            const startMove = this.props.headerMouseDown;
            headerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => startMove(e.clientX, e.clientY);
        }

        return (
            <div className={classes} style={posStyle}>
                <div className="step__header" onMouseDown={headerMouseDown}>
                    <div className="step__icon" />
                    <div className="step__processName">{step.name}</div>
                </div>
                <div className="step__connectors">
                    {inConnector}
                    <div className="step__betweenConnectors" />
                    {outConnector}
                </div>
                <div className="step__parameters">
                    {inputs}
                    {outputs}
                </div>
            </div>
        );
    }
}