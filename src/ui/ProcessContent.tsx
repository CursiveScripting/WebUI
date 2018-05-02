import * as React from 'react';
import { Parameter, Step, UserProcess, ReturnPath } from '../data';
import { StepDisplay } from './StepDisplay';
import './ProcessContent.css';

interface ProcessContentProps {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    process: UserProcess;
}

interface ProcessContentState {
    width: number;
    height: number;
}

const gridSize = 16;

export class ProcessContent extends React.PureComponent<ProcessContentProps, ProcessContentState> {
    private root: HTMLDivElement;
    private ctx: CanvasRenderingContext2D | null;
    private resizeListener?: () => void;
    private draggingStep?: Step;
    private draggingStepConnector?: Step;
    private draggingParamConnector?: Parameter;
    private draggingInput: boolean;
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
                id={this.props.id}
                className={classes}
                style={this.props.style}
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
                inputLinkMouseDown={() => this.stepLinkDragStart(step, true)}
                outputLinkMouseDown={() => this.stepLinkDragStart(step, false)}
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

                // TODO: should be able to have multiple output connectors, one for each return path
                let beginConnector = beginStepDisplay.outputConnector;
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
            
            if (this.draggingInput) {
                let beginConnector = this.getStepDisplay(this.draggingStepConnector).inputConnector;
                if (beginConnector !== null) {
                    this.drawLink(ctx, root, dragRect, beginConnector.getBoundingClientRect());
                }
            }
            else {
                let endConnector = this.getStepDisplay(this.draggingStepConnector).outputConnector;
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
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
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

    private stepLinkDragStart(step: Step, input: boolean) {
        this.draggingStepConnector = step;
        this.draggingInput = input;
    }

    private stepLinkDragStop(step: Step, input: boolean) {
        if (this.draggingStepConnector !== undefined && this.draggingStepConnector !== step && this.draggingInput !== input) {
            let fromStep: Step, toStep: Step;
            if (input) {
                fromStep = this.draggingStepConnector;
                toStep = step;
            }
            else {
                fromStep = step;
                toStep = this.draggingStepConnector;
            }

            if (fromStep.returnPaths.length > 0) {
                // TODO: handle path name here
                let removeFrom = fromStep.returnPaths[0].toStep;
                removeFrom.incomingPaths = removeFrom.incomingPaths.filter(rp => rp.fromStep !== fromStep);
            }

            // TODO: handle path name here
            let newPath = new ReturnPath(fromStep, toStep, null);
            fromStep.returnPaths = [newPath];
            toStep.incomingPaths.push(newPath);
        }

        this.draggingStepConnector = undefined;
        this.forceUpdate();
    }
}