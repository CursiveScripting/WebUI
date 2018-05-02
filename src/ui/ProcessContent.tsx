import * as React from 'react';
import { Parameter, Step, UserProcess } from '../data';
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
        for (let stopStepDisplay of this.stepDisplays) {
            for (let path of stopStepDisplay.props.step.incomingPaths) {
                let startStepDisplay = this.stepDisplays.filter(d => d.props.step === path.fromStep)[0];

                // TODO: should be able to have multiple output connectors, one for each return path
                let startConnector = startStepDisplay.outputConnector;
                let endConnector = stopStepDisplay.inputConnector;

                if (startConnector === null || endConnector === null) {
                    continue;
                }

                // TODO: want position within process content area, not on screen / page!
                this.drawLink(ctx, startConnector.clientLeft, startConnector.clientTop, endConnector.clientLeft, endConnector.clientTop);
            }
        }

        if (this.draggingStepConnector !== undefined) {
            // let startConnector, endConnector;
            if (this.draggingInput) {
                // startConnector = this.draggingStepConnector;
                
            }
            else {
                // endConnector = this.draggingStepConnector;
            }
            
            // TODO: link to drag x / y
        }

        // TODO: draw parameter links

        if (this.draggingParamConnector !== undefined) {
            // TODO: draw dragging parameter link
        }
    }
    
    private drawLink(ctx: CanvasRenderingContext2D, startX: number, startY: number, endX: number, endY: number) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000000';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
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

        this.draggingStep = undefined;
        this.draggingStepConnector = undefined;
        this.draggingParamConnector = undefined;

        this.dragX = 0;
        this.dragY = 0;
    }

    private mouseMove(e: React.MouseEvent<HTMLDivElement>) {
        if (this.draggingStep === undefined) {
            return;
        }

        let dx = e.clientX - this.dragX;
        let dy = e.clientY - this.dragY;
        
        this.dragX = e.clientX;
        this.dragY = e.clientY;

        // const snapSize = 16;
        // this.draggingStep.x = Math.round((this.draggingStep.x + dx) / snapSize) * snapSize;
        // this.draggingStep.y = Math.round((this.draggingStep.y + dy) / snapSize) * snapSize;
        this.draggingStep.x += dx;
        this.draggingStep.y += dy;

        // TODO: only update the step that was dragged!
        this.forceUpdate();
    }

    private parameterLinkDragStart(param: Parameter) {
        this.draggingParamConnector = param;
    }

    private parameterLinkDragStop(param: Parameter) {
        this.draggingParamConnector = undefined;
    }

    private stepLinkDragStart(step: Step, input: boolean) {
        this.draggingStepConnector = step;
        this.draggingInput = input;
    }

    private stepLinkDragStop(step: Step, input: boolean) {
        this.draggingStepConnector = step;
    }
}