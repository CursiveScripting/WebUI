import * as React from 'react';
import { DragInfo, DragType } from './ProcessContent';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import { IType } from '../../workspaceState/IType';
import { IStepDisplay } from './IStepDisplay';
import { IVariableDisplay } from './IVariableDisplay';
import { IRect, ICoord } from '../../data/dimensions';

interface Props {
    className?: string;
    width: number;
    height: number;

    steps: IStepDisplay[];
    variables: IVariableDisplay[];

    stepDisplays: Map<string, StepDisplay>;
    variableDisplays: Map<string, VariableDisplay>;

    dragging?: DragInfo;
}

export class LinkCanvas extends React.Component<Props> {
    private ctx: CanvasRenderingContext2D = undefined as unknown as CanvasRenderingContext2D;

    shouldComponentUpdate(nextProps: Props) {
        // Don't re-render if only the lines should change, just redraw the links.
        const rerender = nextProps.width !== this.props.width
            || nextProps.height !== this.props.height
            || nextProps.className !== this.props.className;

        // this is consistently a step behind, it looks like.
        // Just adding an extra render would work, but wouldn't look fab. Hmm.
        // Makes sense cos the step displays only get their positions when we render, but this (parent) renders first, so they're behind.
        if (!rerender) {
            this.drawLinks();
        }

        return rerender;
    }

    render() {
        const resolveRefs = (c: HTMLCanvasElement | null) => {
            if (c === null) {
                return;
            }

            this.ctx = c.getContext('2d')!;
        };

        return (
            <canvas
                className={this.props.className}
                ref={resolveRefs}
                width={this.props.width}
                height={this.props.height}
            />
        );
    }

    public drawLinks() {
        this.ctx.clearRect(0, 0, this.props.width, this.props.height);
        
        const stepDisplays = this.props.stepDisplays;
        const variableDisplays = this.props.variableDisplays;
        
        for (const step of this.props.steps) {
            const stepDisplay = this.props.stepDisplays.get(step.uniqueId)!;
            
            for (const param of step.inputs) {
                if (param.linkedVariable === undefined) {
                    continue;
                }

                const beginConnector = variableDisplays
                    .get(param.linkedVariable)!
                    .outputConnectorPos;

                const endConnector = stepDisplay.getInputConnectorPos(param.name)!;

                this.drawParameterLink(param.type, beginConnector, endConnector);
            }

            for (const param of step.outputs) {
                if (param.linkedVariable === undefined) {
                    continue;
                }

                const beginConnector = stepDisplay.getOutputConnectorPos(param.name)!;

                const endConnector = variableDisplays
                    .get(param.linkedVariable)!
                    .inputConnectorPos;

                this.drawParameterLink(param.type, beginConnector, endConnector);
            }

            for (const [pathName, toStepId] of step.returnPaths) {
                if (toStepId === null) {
                    continue;
                }

                const toStepDisplay = stepDisplays.get(toStepId!)!;
                
                const beginConnector = stepDisplay.getReturnConnectorPos(pathName);
                const endConnector = toStepDisplay.entryConnectorPos;
                
                if (beginConnector !== null && endConnector !== null) {
                    const fitAround = step.uniqueId === toStepId
                        ? stepDisplay.bounds
                        : undefined;

                    this.drawProcessLink(beginConnector, endConnector, fitAround);
                }
            }
        }

        const dragging = this.props.dragging;
        if (dragging === undefined) {
            return;
        }
        
        if (dragging.type === DragType.StepParameter) {
            const stepDisplay = stepDisplays.get(dragging.step.uniqueId)!;

            let fromPos: ICoord;
            let toPos: ICoord;

            if (dragging.input) {
                fromPos = dragging;
                toPos = stepDisplay.getInputConnectorPos(dragging.param.name);
            }
            else {
                fromPos = stepDisplay.getOutputConnectorPos(dragging.param.name);
                toPos = dragging;
            }

            this.drawParameterLink(dragging.param.type, fromPos, toPos);
        }
        else if (dragging.type === DragType.VarParameter) {
            const varDisplay = variableDisplays.get(dragging.variable.name)!;

            let fromPos: ICoord;
            let toPos: ICoord;

            if (dragging.input) {
                fromPos = dragging;
                toPos = varDisplay.inputConnectorPos;
            }
            else {
                fromPos = varDisplay.outputConnectorPos;
                toPos = dragging;
            }

            this.drawParameterLink(dragging.variable.type, fromPos, toPos);
        }
        else if (dragging.type === DragType.StepInConnector) {
            const beginConnector = stepDisplays.get(dragging.step.uniqueId)!.entryConnectorPos;
            if (beginConnector !== null) {
                this.drawProcessLink(dragging, beginConnector);
            }
        }
        else if (dragging.type === DragType.ReturnPath) {
            const endConnector = stepDisplays.get(dragging.step.uniqueId)!.getReturnConnectorPos(dragging.returnPath);
            if (endConnector !== null) {
                this.drawProcessLink(endConnector, dragging);
            }
        }
    }
    
    private drawProcessLink(
        startPos: ICoord,
        endPos: ICoord,
        fitBelow?: IRect,
    ) {
        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#000000';

        if (fitBelow === undefined) {
            this.drawCurve(startPos, endPos);
        }
        else {
            const midPos = {
                x: (startPos.x + endPos.x) / 2,
                y: fitBelow.y + fitBelow.height,
            }

            const cp1 = {
                x: startPos.x + 100,
                y: startPos.y,
            }

            const cp2 = {
                x: midPos.x + 150,
                y: midPos.y,
            }

            const cp3 = {
                x: midPos.x - 150,
                y: midPos.y,
            }

            const cp4 = {
                x: endPos.x - 100,
                y: endPos.y,
            }

            this.drawCurveWithControlPoints(startPos, cp1, cp2, midPos);
            this.drawCurveWithControlPoints(midPos, cp3, cp4, endPos);
        }
    }

    private drawParameterLink(
        type: IType,
        startPos: ICoord,
        endPos: ICoord
    ) {
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = type.color;
        this.drawCurve(startPos, endPos);
    }

    private drawCurve(start: ICoord, end: ICoord) {
        const cpOffset = Math.min(150, Math.abs(end.y - start.y));

        const mid1 = {
            x: start.x + cpOffset,
            y: start.y,
        }

        const mid2 = {
            x: end.x - cpOffset,
            y: end.y,
        }

        this.drawCurveWithControlPoints(start, mid1, mid2, end);
    }

    private drawCurveWithControlPoints(start: ICoord, mid1: ICoord, mid2: ICoord, end: ICoord) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.bezierCurveTo(
            mid1.x, mid1.y,
            mid2.x, mid2.y,
            end.x, end.y
        );
        this.ctx.stroke();
    }
}