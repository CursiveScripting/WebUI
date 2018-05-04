import * as React from 'react';
import { Parameter, Step, UserProcess, ReturnPath, Type, Variable } from '../data';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import './ProcessContent.css';

interface ProcessContentProps {
    process: UserProcess;
    className?: string;
    dropVariableType?: Type;
    itemDropped: () => void;
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
    private ctx: CanvasRenderingContext2D;
    private resizeListener?: () => void;
    private draggingStep?: Step;
    private draggingVariable?: Variable;
    private draggingStepConnector?: StepConnectorDragInfo;
    private draggingParamConnector?: Parameter;
    private dragX: number = 0;
    private dragY: number = 0;
    private stepDisplays: StepDisplay[];
    private variableDisplays: VariableDisplay[];

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
                    ref={c => {if (c !== null) { let ctx = c.getContext('2d'); if (ctx !== null) { this.ctx = ctx; }}}}
                    width={this.state.width}
                    height={this.state.height}
                />
                {this.renderSteps()}
                {this.renderVariables()}
            </div>
        );
    }

    componentDidMount() {
        this.resizeListener = () => this.updateSize();
        window.addEventListener('resize', this.resizeListener);
    
        this.updateSize();
        this.drawLinks(this.ctx);
    }

    componentDidUpdate() {
        this.drawLinks(this.ctx);
    }
    
    componentWillUnmount() {
        if (this.resizeListener !== undefined) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }
    
    private renderSteps() {
        this.stepDisplays = [];

        return this.props.process.steps.map((step, idx) => (
            <StepDisplay
                ref={s => { if (s !== null) { this.stepDisplays.push(s); }}}
                step={step}
                key={idx}
                readonly={false}
                headerMouseDown={(x, y) => this.stepDragStart(step, x, y)}
                inputLinkMouseDown={() => this.stepLinkDragStart(step, true, null)}
                outputLinkMouseDown={returnPath => this.stepLinkDragStart(step, false, returnPath)}
                inputLinkMouseUp={() => this.stepLinkDragStop(step, true, null)}
                outputLinkMouseUp={returnPath => this.stepLinkDragStop(step, false, returnPath)}
                parameterLinkMouseDown={(param) => this.parameterLinkDragStart(param)}
                parameterLinkMouseUp={(param) => this.parameterLinkDragStop(param)}
            />
        ));
    }
    
    private renderVariables() {
        this.variableDisplays = [];

        return this.props.process.variables.map((variable, idx) => (
            <VariableDisplay
                ref={v => { if (v !== null) { this.variableDisplays.push(v); }}}
                variable={variable}
                key={idx}
                mouseDown={(x, y) => this.varDragStart(variable, x, y)}
            />
        ));
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

    private varDragStart(variable: Variable, startX: number, startY: number) {
        this.draggingVariable = variable;
        this.dragX = startX;
        this.dragY = startY;
    }

    private dragStop() {
        if (this.props.dropVariableType !== undefined) {
            let name = this.props.process.getNewVariableName(this.props.dropVariableType);
            let root = this.root.getBoundingClientRect();

            // get content-relative coordinates from screen-relative drag coordinates
            let x = this.dragX - root.left;
            let y = this.dragY - root.top;

            let newVar = new Variable(name , this.props.dropVariableType, this.alignToGrid(x), this.alignToGrid(y));
            this.props.process.variables.push(newVar);
            this.props.itemDropped();
        }

        else if (this.draggingStep !== undefined) {
            this.draggingStep.x = this.alignToGrid(this.draggingStep.x);
            this.draggingStep.y = this.alignToGrid(this.draggingStep.y);

            this.draggingStep = undefined;
            // TODO: only update the step that was dragged!
            this.forceUpdate();
        }

        else if (this.draggingVariable !== undefined) {
            this.draggingVariable.x = this.alignToGrid(this.draggingVariable.x);
            this.draggingVariable.y = this.alignToGrid(this.draggingVariable.y);

            this.draggingVariable = undefined;
            // TODO: only update the variable that was dragged!
            this.forceUpdate();
        }

        else if (this.draggingStepConnector !== undefined) {
            this.draggingStepConnector = undefined;
            this.drawLinks(this.ctx);
        }

        else if (this.draggingParamConnector !== undefined) {
            this.draggingParamConnector = undefined;
        }

        this.dragX = 0;
        this.dragY = 0;
    }

    private mouseMove(e: React.MouseEvent<HTMLDivElement>) {
        let dx = e.clientX - this.dragX;
        let dy = e.clientY - this.dragY;
        
        this.dragX = e.clientX;
        this.dragY = e.clientY;

        if (this.draggingStepConnector !== undefined) {
            this.drawLinks(this.ctx);
        }

        else if (this.draggingStep !== undefined) {
            this.draggingStep.x += dx;
            this.draggingStep.y += dy;
            
            this.forceUpdate(); // TODO: only update the step that was dragged!
        }

        else if (this.draggingVariable !== undefined) {
            this.draggingVariable.x += dx;
            this.draggingVariable.y += dy;

            this.forceUpdate(); // TODO: only update the variable that was dragged!
        }
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

    private stepLinkDragStop(step: Step, input: boolean, returnPath: string | null) {
        if (this.draggingStepConnector === undefined) {
            return;
        }

        let dragInfo = this.draggingStepConnector;
        this.draggingStepConnector = undefined;

        if (dragInfo.step === step || dragInfo.input === input) {
            this.drawLinks(this.ctx);
            return;
        }

        let fromStep: Step, toStep: Step;
        if (input) {
            fromStep = dragInfo.step;
            toStep = step;
            returnPath = dragInfo.returnPath;
        }
        else {
            fromStep = step;
            toStep = dragInfo.step;
        }

        let existingPaths = fromStep.returnPaths.filter(r => r.name === returnPath);
        for (let existingPath of existingPaths) {
            let removeFrom = existingPath.toStep;
            removeFrom.incomingPaths = removeFrom.incomingPaths.filter(rp => rp.fromStep !== fromStep || rp.name !== returnPath);
        }

        fromStep.returnPaths = fromStep.returnPaths.filter(r => r.name !== returnPath);
        let newPath = new ReturnPath(fromStep, toStep, returnPath);
        fromStep.returnPaths.push(newPath);
        toStep.incomingPaths.push(newPath);

        this.forceUpdate();
    }

    private alignToGrid(val: number) {
        return Math.round(val / gridSize) * gridSize;
    }
}