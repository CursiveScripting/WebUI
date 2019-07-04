import * as React from 'react';
import { Type, Variable, Step, Parameter } from '../../data';
import { Coord, ParamConnectorDragInfo, StepConnectorDragInfo } from './ProcessContent';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';

export type LinkDragInfo = {
    isParam: false;
    pathInfo: StepConnectorDragInfo;
    x: number;
    y: number;
} | {
    isParam: true;
    paramInfo: ParamConnectorDragInfo;
    x: number;
    y: number;
}

interface Props {
    className?: string;
    width: number;
    height: number;

    stepDisplays: Map<Step, StepDisplay>;
    variableDisplays: Map<Variable, VariableDisplay>;

    dragging?: LinkDragInfo;
}

export class LinkCanvas extends React.Component<Props> {
    private canvas: HTMLCanvasElement = undefined as unknown as HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D = undefined as unknown as CanvasRenderingContext2D;

    shouldComponentUpdate(nextProps: Props) {
        // Don't re-render if only dragging changes. Just redraw the links.
        const rerender = nextProps.width !== this.props.width
            || nextProps.height !== this.props.height
            || nextProps.className !== this.props.className;

        if (!rerender && nextProps.dragging !== this.props.dragging) {
            this.drawLinks();
        }

        return rerender;
    }

    render() {
        const resolveRefs = (c: HTMLCanvasElement | null) => {
            if (c === null) {
                return;
            }

            this.canvas = c;
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
        
        const root = this.canvas.getBoundingClientRect();
        const stepDisplays = this.props.stepDisplays;
        const variableDisplays = this.props.variableDisplays;
        
        for (const [step, stepDisplay] of stepDisplays) {
            for (const path of step.incomingPaths) {
                const beginStepDisplay = stepDisplays.get(path.fromStep)!;
                
                const beginConnector = beginStepDisplay.getReturnConnector(path.name);
                const endConnector = stepDisplay.entryConnector;
                
                if (beginConnector !== null && endConnector !== null) {
                    const bounds = step === path.fromStep
                        ? stepDisplay.bounds
                        : undefined;
                    this.drawProcessLink(root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect(), bounds);
                }
            }

            for (const parameter of stepDisplay.props.step.inputs) {
                if (parameter.link === null) {
                    continue;
                }

                const endConnector = stepDisplay.getInputConnector(parameter);

                const variableDisplay = variableDisplays.get(parameter.link)!;
                const beginConnector = variableDisplay.outputConnector;

                this.drawFieldLink(parameter.type, root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
            }

            for (const parameter of stepDisplay.props.step.outputs) {
                if (parameter.link === null) {
                    continue;
                }

                const beginConnector = stepDisplay.getOutputConnector(parameter);

                const variableDisplay = variableDisplays.get(parameter.link)!;
                const endConnector = variableDisplay.inputConnector;

                this.drawFieldLink(parameter.type, root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
            }
        }

        const dragging = this.props.dragging;
        if (dragging !== undefined) {
            const dragRect = {
                left: dragging.x, right: dragging.x,
                top: dragging.y, bottom: dragging.y,
                width: 0, height: 0,
            };

            if (dragging.isParam) {
                const dragInfo = dragging.paramInfo;
                let connector: HTMLDivElement;
    
                if (dragInfo.step !== undefined) {
                    const stepDisplay = stepDisplays.get(dragInfo.step)!;
                    connector = dragInfo.input
                        ? stepDisplay.getInputConnector(dragInfo.field as Parameter)
                        : stepDisplay.getOutputConnector(dragInfo.field as Parameter);
                }
                else {
                    const varDisplay = variableDisplays.get(dragInfo.field as Variable)!;
                    connector = dragInfo.input
                        ? varDisplay.inputConnector
                        : varDisplay.outputConnector;
                }
    
                if (dragInfo.input) {
                    this.drawFieldLink(dragInfo.field.type, root, dragRect, connector.getBoundingClientRect());
                }
                else {
                    this.drawFieldLink(dragInfo.field.type, root, connector.getBoundingClientRect(), dragRect);
                }
            }
            else {
                const dragInfo = dragging.pathInfo;
                
                if (dragInfo.input) {
                    const beginConnector = stepDisplays.get(dragInfo.step)!.entryConnector;
                    if (beginConnector !== null) {
                        this.drawProcessLink(root, dragRect, beginConnector.getBoundingClientRect());
                    }
                }
                else {
                    const endConnector = stepDisplays.get(dragInfo.step)!.getReturnConnector(dragInfo.returnPath);
                    if (endConnector !== null) {
                        this.drawProcessLink(root, endConnector.getBoundingClientRect(), dragRect);
                    }
                }
            }
        }
    }
    
    private drawProcessLink(
        root: ClientRect | DOMRect,
        begin: ClientRect | DOMRect,
        end: ClientRect | DOMRect,
        fitBelow?: ClientRect | DOMRect,
    ) {
        const startPos = {
            x: begin.right - root.left,
            y: begin.top + begin.height / 2 - root.top,
        };

        const endPos = {
            x: end.left - root.left,
            y: end.top + end.height / 2 - root.top,
        };

        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#000000';

        if (fitBelow === undefined) {
            this.drawCurve(startPos, endPos);
        }
        else {
            const midPos = {
                x: (startPos.x + endPos.x) / 2,
                y: fitBelow.bottom,
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

    private drawFieldLink(
        type: Type,
        root: ClientRect | DOMRect,
        begin: ClientRect | DOMRect,
        end: ClientRect | DOMRect
    ) {
        const startPos = {
            x: begin.right - root.left,
            y: begin.top + begin.height / 2 - root.top,
        };

        const endPos = {
            x: end.left - root.left,
            y: end.top + end.height / 2 - root.top,
        }
        
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = type.color;
        this.drawCurve(startPos, endPos);
    }

    private drawCurve(start: Coord, end: Coord) {
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

    private drawCurveWithControlPoints(start: Coord, mid1: Coord, mid2: Coord, end: Coord) {
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.bezierCurveTo(mid1.x, mid1.y, mid2.x, mid2.y, end.x, end.y);
        this.ctx.stroke();
    }
}