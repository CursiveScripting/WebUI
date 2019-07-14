import * as React from 'react';
import { ICoord, DragInfo, DragType } from './ProcessContent';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import { IType } from '../../workspaceState/IType';
import { IStepDisplay } from './IStepDisplay';
import { IVariableDisplay } from './IVariableDisplay';

interface Props {
    className?: string;
    width: number;
    height: number;
    minScreenX: number;
    minScreenY: number;

    steps: IStepDisplay[];
    variables: IVariableDisplay[];

    stepDisplays: Map<string, StepDisplay>;
    variableDisplays: Map<string, VariableDisplay>;

    dragging?: DragInfo;
}

export class LinkCanvas extends React.Component<Props> {
    private canvas: HTMLCanvasElement = undefined as unknown as HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D = undefined as unknown as CanvasRenderingContext2D;

    shouldComponentUpdate(nextProps: Props) {
        // Don't re-render if only the lines should change, just redraw the links.
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
                    .outputConnector;

                const endConnector = stepDisplay.getInputConnector(param.name)!;

                this.drawFieldLink(param.type, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
            }

            for (const param of step.outputs) {
                if (param.linkedVariable === undefined) {
                    continue;
                }

                const beginConnector = stepDisplay.getOutputConnector(param.name)!;

                const endConnector = variableDisplays
                    .get(param.linkedVariable)!
                    .inputConnector;

                this.drawFieldLink(param.type, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
            }

            for (const [pathName, toStepId] of step.returnPaths) {
                if (toStepId === null) {
                    continue;
                }

                const toStepDisplay = stepDisplays.get(toStepId!)!;
                
                const beginConnector = stepDisplay.getReturnConnector(pathName);
                const endConnector = toStepDisplay.entryConnector;
                
                if (beginConnector !== null && endConnector !== null) {
                    const bounds = step.uniqueId === toStepId
                        ? stepDisplay.bounds
                        : undefined;
                    this.drawProcessLink(beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect(), bounds);
                }
            }
        }

        const dragging = this.props.dragging;
        if (dragging === undefined) {
            return;
        }
        
        if (dragging.type === DragType.StepParameter) {
            const stepDisplay = stepDisplays.get(dragging.step.uniqueId)!;

            let connector: HTMLDivElement;
            let fromRect: ClientRect | DOMRect;
            let toRect: ClientRect | DOMRect;

            if (dragging.input) {
                connector = stepDisplay.getInputConnector(dragging.param.name)!;
                fromRect = this.createPointRect(dragging);
                toRect = connector.getBoundingClientRect();
            }
            else {
                connector = stepDisplay.getOutputConnector(dragging.param.name)!;
                fromRect = connector.getBoundingClientRect();
                toRect = this.createPointRect(dragging);
            }

            this.drawFieldLink(dragging.param.type, fromRect, toRect);
        }
        else if (dragging.type === DragType.VarParameter) {
            const varDisplay = variableDisplays.get(dragging.variable.name)!;

            let connector: HTMLDivElement;
            let fromRect: ClientRect | DOMRect;
            let toRect: ClientRect | DOMRect;

            if (dragging.input) {
                connector = varDisplay.inputConnector;
                fromRect = this.createPointRect(dragging);
                toRect = connector.getBoundingClientRect();
            }
            else {
                connector = varDisplay.outputConnector;
                fromRect = connector.getBoundingClientRect();
                toRect = this.createPointRect(dragging);
            }

            this.drawFieldLink(dragging.variable.type, fromRect, toRect);
        }
        else if (dragging.type === DragType.StepInConnector) {
            const beginConnector = stepDisplays.get(dragging.step.uniqueId)!.entryConnector;
            if (beginConnector !== null) {
                this.drawProcessLink(this.createPointRect(dragging), beginConnector.getBoundingClientRect());
            }
        }
        else if (dragging.type === DragType.ReturnPath) {
            const endConnector = stepDisplays.get(dragging.step.uniqueId)!.getReturnConnector(dragging.returnPath);
            if (endConnector !== null) {
                this.drawProcessLink(endConnector.getBoundingClientRect(), this.createPointRect(dragging));
            }
        }
    }
    
    private createPointRect(dragging: DragInfo) {
        const x = dragging.x + this.props.minScreenX;
        const y = dragging.y + this.props.minScreenY;

        return {
            left: x,
            right: x,
            top: y,
            bottom: y,
            width: 0,
            height: 0,
        };
    }

    private drawProcessLink(
        begin: ClientRect | DOMRect,
        end: ClientRect | DOMRect,
        fitBelow?: ClientRect | DOMRect,
    ) {
        const startPos = {
            x: begin.right,
            y: begin.top + begin.height / 2,
        };

        const endPos = {
            x: end.left,
            y: end.top + end.height / 2,
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
        type: IType,
        begin: ClientRect | DOMRect,
        end: ClientRect | DOMRect
    ) {
        const startPos = {
            x: begin.right,
            y: begin.top + begin.height / 2,
        };

        const endPos = {
            x: end.left,
            y: end.top + end.height / 2,
        }
        
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
        this.ctx.moveTo(start.x - this.props.minScreenX, start.y - this.props.minScreenY);
        this.ctx.bezierCurveTo(
            mid1.x - this.props.minScreenX, mid1.y - this.props.minScreenY,
            mid2.x - this.props.minScreenX, mid2.y - this.props.minScreenY,
            end.x - this.props.minScreenX, end.y - this.props.minScreenY
        );
        this.ctx.stroke();
    }
}