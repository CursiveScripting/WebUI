import * as React from 'react';
import { Parameter, Step, UserProcess, ReturnPath } from '../data';
import { StepDisplay } from './StepDisplay';
import './ProcessContent.css';

interface ProcessContentProps {
    process: UserProcess;
    className?: string;
}

interface ProcessContentState {
    width: number;
    height: number;
}

interface StepConnectorDragInfo {
    step: Step;
    input: boolean;
    returnPath: string | null;
}

const gridSize = 16;

export class ProcessContent extends React.PureComponent<ProcessContentProps, ProcessContentState> {
    private root: HTMLDivElement;
    private ctx: CanvasRenderingContext2D | null;
    private resizeListener?: () => void;
    private draggingStep?: Step;
    private draggingStepConnector?: StepConnectorDragInfo;
    private draggingParamConnector?: Parameter;
    private dragX: number = 0;
    private dragY: number = 0;
    private stepDisplays: StepDisplay[];

    constructor(props: ProcessContentProps) {
        super(props);

        this.state = {
            width: 0,
            height: 0,
        };
    }

    render() {
        let classes = 'processContent';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        return (
            <div
                className={classes}
                ref={r => { if (r !== null) { this.root = r; }}}
                onMouseMove={e => this.mouseMove(e)}
                onMouseUp={e => this.dragStop()}
            >
                <canvas
                    className="processContent__canvas"
                    ref={c => this.ctx = c === null ? null : c.getContext('2d')}
                    width={this.state.width}
                    height={this.state.height}
                />
                {this.renderSteps()}
            </div>
        );
    }

    componentDidMount() {
        this.resizeListener = () => this.updateSize();
        window.addEventListener('resize', this.resizeListener);
    
        this.updateSize();

        if (this.ctx !== null) {
            this.drawLinks(this.ctx);
        }
    }

    componentDidUpdate() {
        if (this.ctx !== null) {
            this.drawLinks(this.ctx);
        }
    }
    
    componentWillUnmount() {
        if (this.resizeListener !== undefined) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }
    
    private renderSteps() {
        const stepDisplays: StepDisplay[] = [];

        let stepDisplay = this.props.process.steps.map((step, idx) => (
            <StepDisplay
                ref={s => { if (s !== null) { stepDisplays.push(s); }}}
                step={step}
                key={idx}
                readonly={false}
                headerMouseDown={(x, y) => this.stepDragStart(step, x, y)}
                inputLinkMouseDown={() => this.stepLinkDragStart(step, true, null)}
                outputLinkMouseDown={returnPath => this.stepLinkDragStart(step, false, returnPath)}
                inputLinkMouseUp={() => this.stepLinkDragStop(step, true)}
                outputLinkMouseUp={() => this.stepLinkDragStop(step, false)}
                parameterLinkMouseDown={(param) => this.parameterLinkDragStart(param)}
                parameterLinkMouseUp={(param) => this.parameterLinkDragStop(param)}
            />
        ));

        this.stepDisplays = stepDisplays;
        return stepDisplay;
    }

    private drawLinks(ctx: CanvasRenderingContext2D) {
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        let root = this.root.getBoundingClientRect();
        
        for (let endStepDisplay of this.stepDisplays) {
            for (let path of endStepDisplay.props.step.incomingPaths) {
                let beginStepDisplay = this.getStepDisplay(path.fromStep);

                let beginConnector = beginStepDisplay.getOutputConnector(path.name);
                let endConnector = endStepDisplay.inputConnector;
                
                if (beginConnector !== null && endConnector !== null) {
                    this.drawLink(ctx, root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
                }
            }
        }

        if (this.draggingStepConnector !== undefined) {
            let dragRect = {
                left: this.dragX, right: this.dragX,
                top: this.dragY, bottom: this.dragY,
                width: 0, height: 0,
            };

            let dragInfo = this.draggingStepConnector;
            
            if (dragInfo.input) {
                let beginConnector = this.getStepDisplay(dragInfo.step).inputConnector;
                if (beginConnector !== null) {
                    this.drawLink(ctx, root, dragRect, beginConnector.getBoundingClientRect());
                }
            }
            else {
                let endConnector = this.getStepDisplay(dragInfo.step).getOutputConnector(dragInfo.returnPath);
                if (endConnector !== null) {
                    this.drawLink(ctx, root, endConnector.getBoundingClientRect(), dragRect);
                }
            }
        }

        // TODO: draw parameter links

        if (this.draggingParamConnector !== undefined) {
            // TODO: draw dragging parameter link
        }
    }
    
    private drawLink(ctx: CanvasRenderingContext2D, root: ClientRect | DOMRect, begin: ClientRect | DOMRect, end: ClientRect | DOMRect) {
        let x1 = begin.right - root.left, y1 = begin.top + begin.height / 2 - root.top;
        let x2 = end.left - root.left, y2 = end.top + end.height / 2 - root.top;

        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        this.drawCurve(ctx, x1, y1, x2, y2);
    }

    private drawCurve(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) {
        let cpOffset = Math.min(150, Math.abs(endY - startY));

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.bezierCurveTo(startX + cpOffset, startY, endX - cpOffset, endY, endX, endY);
        ctx.stroke();
    }

    private getStepDisplay(step: Step) {
        return this.stepDisplays.filter(d => d.props.step === step)[0];
    }

    private updateSize() {
        this.setState({
            width: this.root.offsetWidth,
            height: this.root.offsetHeight,
        });
    }

    private stepDragStart(step: Step, startX: number, startY: number) {
        this.draggingStep = step;
        this.dragX = startX;
        this.dragY = startY;
    }

    private dragStop() {
        // align to grid
        if (this.draggingStep !== undefined) {
            this.draggingStep.x = Math.round(this.draggingStep.x / gridSize) * gridSize;
            this.draggingStep.y = Math.round(this.draggingStep.y / gridSize) * gridSize;

            // TODO: only update the step that was dragged!
            this.forceUpdate();
        }

        if (this.draggingStepConnector !== undefined && this.ctx !== null) {
            this.draggingStepConnector = undefined;
            this.drawLinks(this.ctx);
        }

        this.draggingStep = undefined;
        this.draggingParamConnector = undefined;

        this.dragX = 0;
        this.dragY = 0;
    }

    private mouseMove(e: React.MouseEvent<HTMLDivElement>) {
        let dx = e.clientX - this.dragX;
        let dy = e.clientY - this.dragY;
        
        this.dragX = e.clientX;
        this.dragY = e.clientY;

        if (this.draggingStepConnector !== undefined && this.ctx !== null) {
            this.drawLinks(this.ctx);
            return;
        }

        if (this.draggingStep === undefined) {
            return;
        }

        this.draggingStep.x += dx;
        this.draggingStep.y += dy;

        // TODO: only update the step that was dragged!
        this.forceUpdate();
    }

    private parameterLinkDragStart(param: Parameter) {
        console.log('started dragging on link', param.name);
        this.draggingParamConnector = param;
    }

    private parameterLinkDragStop(param: Parameter) {
        console.log('stopped dragging on link', param.name);
        this.draggingParamConnector = undefined;
    }

    private stepLinkDragStart(step: Step, input: boolean, returnPath: string | null) {
        this.draggingStepConnector = {
            step: step,
            input: input,
            returnPath: returnPath,
        };
    }

    private stepLinkDragStop(step: Step, input: boolean) {
        if (this.draggingStepConnector === undefined) {
            return;
        }

        let dragInfo = this.draggingStepConnector;
        this.draggingStepConnector = undefined;

        if (dragInfo.step === step || dragInfo.input === input) {
            if (this.ctx != null) {
                this.drawLinks(this.ctx);
            }
            return;
        }

        let fromStep: Step, toStep: Step;
        if (input) {
            fromStep = dragInfo.step;
            toStep = step;
        }
        else {
            fromStep = step;
            toStep = dragInfo.step;
        }

        let existingPaths = fromStep.returnPaths.filter(r => r.name === dragInfo.returnPath);
        for (let existingPath of existingPaths) {
            let removeFrom = existingPath.toStep;
            removeFrom.incomingPaths = removeFrom.incomingPaths.filter(rp => rp.fromStep !== fromStep || rp.name !== dragInfo.returnPath);
        }

        fromStep.returnPaths = fromStep.returnPaths.filter(r => r.name !== dragInfo.returnPath);
        let newPath = new ReturnPath(fromStep, toStep, dragInfo.returnPath);
        fromStep.returnPaths.push(newPath);
        toStep.incomingPaths.push(newPath);

        this.forceUpdate();
    }
}