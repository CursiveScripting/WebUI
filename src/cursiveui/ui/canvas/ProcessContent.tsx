import * as React from 'react';
import { Step, UserProcess, ReturnPath, Type, Variable, DataField, StopStep, ProcessStep, Process, Parameter } from '../../data';
import { getScrollbarSize } from '../getScrollbarSize';
import { gridSize, growToFitGrid, alignToGrid } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import { Positionable } from '../../data/Positionable';
import './ProcessContent.css';

interface ProcessContentProps {
    process: UserProcess;
    className?: string;
    dropVariableType?: Type;
    dropStep?: Process;
    dropStopStep?: string | null;
    focusStep?: Step;
    focusStepParameter?: Parameter;
    focusStepReturnPath?: string | null;
    itemDropped: () => void;
    stepDragging: (step: Step | undefined) => void;
    variableDragging: (variable: Variable | undefined) => void;
    revalidate: () => void;
}

interface ProcessContentState {
    viewWidth: number;
    viewHeight: number;
    contentWidth: number;
    contentHeight: number;
    scrollbarWidth: number;
    scrollbarHeight: number;
}

interface StepConnectorDragInfo {
    step: Step;
    input: boolean;
    returnPath: string | null;
}

interface ParamConnectorDragInfo {
    field: DataField;
    input?: boolean;
    step?: Step;
}

export class ProcessContent extends React.PureComponent<ProcessContentProps, ProcessContentState> {
    private root: HTMLDivElement = undefined as unknown as HTMLDivElement;
    private ctx: CanvasRenderingContext2D = undefined as unknown as CanvasRenderingContext2D;
    private resizeListener?: () => void;
    private draggingStep?: Step;
    private draggingVariable?: Variable;
    private draggingStepConnector?: StepConnectorDragInfo;
    private draggingParamConnector?: ParamConnectorDragInfo;
    private dragX: number = 0;
    private dragY: number = 0;
    private readonly stepDisplays = new Map<Step, StepDisplay>();
    private readonly variableDisplays = new Map<Variable, VariableDisplay>();

    constructor(props: ProcessContentProps) {
        super(props);

        const scrollSize = getScrollbarSize();

        this.state = {
            viewWidth: 0,
            viewHeight: 0,
            contentWidth: 0,
            contentHeight: 0,
            scrollbarWidth: scrollSize.width,
            scrollbarHeight: scrollSize.height,
        };
    }

    render() {
        let classes = 'processContent';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        const contentSizeStyle = {
            width: this.state.contentWidth + 'px',
            height: this.state.contentHeight + 'px'
        };
        
        let canvasWidth = this.state.viewWidth;
        if (this.state.viewWidth < this.state.contentWidth) {
            canvasWidth -= this.state.scrollbarWidth;
        }

        let canvasHeight = this.state.viewHeight;
        if (this.state.viewHeight < this.state.contentHeight) {
            canvasHeight -= this.state.scrollbarHeight;
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
                    width={canvasWidth}
                    height={canvasHeight}
                />
                <div
                    className="processContent__scrollWrapper"
                    onScroll={() => this.drawLinks()}
                >
                    <div className="processContent__backgroundScroll" style={contentSizeStyle} />
                    <div className="processContent__scrollRoot" style={contentSizeStyle}>
                        {this.renderSteps()}
                        {this.renderVariables()}
                    </div>
                </div>
            </div>
        );
    }

    componentDidMount() {
        this.resizeListener = () => this.updateViewSize();
        window.addEventListener('resize', this.resizeListener);
    
        this.updateViewSize();
        this.drawLinks();
    }

    componentDidUpdate(prevProps: ProcessContentProps, prevState: ProcessContentState) {
        if (prevProps.focusStep === undefined && this.props.focusStep !== undefined) {
            this.getStepDisplay(this.props.focusStep).scrollIntoView();
        }

        this.drawLinks();
    }
    
    componentWillUnmount() {
        if (this.resizeListener !== undefined) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }
    
    private renderSteps() {
        this.stepDisplays.clear();

        return Array.from(this.props.process.steps.values()).map(step => (
            <StepDisplay
                ref={s => { if (s !== null) { this.stepDisplays.set(step, s); } else { this.stepDisplays.delete(step); }}}
                key={step.uniqueID}
                step={step}
                focused={step === this.props.focusStep}
                focusParameter={this.props.focusStepParameter}
                focusReturnPath={this.props.focusStepReturnPath}
                readonly={false}
                headerMouseDown={(x, y) => this.stepDragStart(step, x, y)}
                inputLinkMouseDown={() => this.stepLinkDragStart(step, true, null)}
                outputLinkMouseDown={returnPath => this.stepLinkDragStart(step, false, returnPath)}
                inputLinkMouseUp={() => this.stepLinkDragStop(step, true, null)}
                outputLinkMouseUp={returnPath => this.stepLinkDragStop(step, false, returnPath)}
                parameterLinkMouseDown={(param, input) => this.fieldLinkDragStart(param, input, step)}
                parameterLinkMouseUp={(param, input) => this.fieldLinkDragStop(param, input, step)}
                defaultChanged={param => this.props.revalidate()}
            />
        ));
    }
    
    private renderVariables() {
        this.variableDisplays.clear();

        return this.props.process.variables.map(variable => (
            <VariableDisplay
                ref={v => { if (v !== null) { this.variableDisplays.set(variable, v); } else { this.variableDisplays.delete(variable); }}}
                name={variable.name}
                type={variable.type}
                x={variable.x}
                y={variable.y}
                initialValue={variable.initialValue}
                links={variable.links}
                key={variable.name}
                initialValueChanged={val => this.variableDefaultChanged(variable, val)}
                nameMouseDown={(x, y) => this.varDragStart(variable, x, y)}
                connectorMouseDown={() => this.fieldLinkDragStart(variable, undefined, undefined)}
                connectorMouseUp={() => this.fieldLinkDragStop(variable, undefined, undefined)}
            />
        ));
    }

    private variableDefaultChanged(variable: Variable, value: string | null) {
        variable.initialValue = value;

        // TODO: some sort of revalidation?

        this.forceUpdate();
    }

    private drawLinks() {
        this.ctx.clearRect(0, 0, this.state.viewWidth, this.state.viewHeight);
        
        let root = this.root.getBoundingClientRect();
        
        for (const [step, stepDisplay] of this.stepDisplays) {
            for (const path of step.incomingPaths) {
                let beginStepDisplay = this.getStepDisplay(path.fromStep);
                
                let beginConnector = beginStepDisplay.getReturnConnector(path.name);
                let endConnector = stepDisplay.entryConnector;
                
                if (beginConnector !== null && endConnector !== null) {
                    this.drawProcessLink(root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
                }
            }

            for (let parameter of stepDisplay.props.step.inputs) {
                if (parameter.link === null) {
                    continue;
                }

                let endConnector = stepDisplay.getInputConnector(parameter);

                let variableDisplay = this.getVariableDisplay(parameter.link);
                let beginConnector = variableDisplay.connector;

                this.drawFieldLink(parameter.type, root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
            }

            for (let parameter of stepDisplay.props.step.outputs) {
                if (parameter.link === null) {
                    continue;
                }

                let beginConnector = stepDisplay.getOutputConnector(parameter);

                let variableDisplay = this.getVariableDisplay(parameter.link);
                let endConnector = variableDisplay.connector;

                this.drawFieldLink(parameter.type, root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
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
                let beginConnector = this.getStepDisplay(dragInfo.step).entryConnector;
                if (beginConnector !== null) {
                    this.drawProcessLink(root, dragRect, beginConnector.getBoundingClientRect());
                }
            }
            else {
                let endConnector = this.getStepDisplay(dragInfo.step).getReturnConnector(dragInfo.returnPath);
                if (endConnector !== null) {
                    this.drawProcessLink(root, endConnector.getBoundingClientRect(), dragRect);
                }
            }
        }

        if (this.draggingParamConnector !== undefined) {
            let dragRect = {
                left: this.dragX, right: this.dragX,
                top: this.dragY, bottom: this.dragY,
                width: 0, height: 0,
            };
            
            let dragInfo = this.draggingParamConnector;
            let connector: HTMLDivElement;

            if (dragInfo.step !== undefined) {
                let stepDisplay = this.getStepDisplay(dragInfo.step);
                connector = dragInfo.input
                    ? stepDisplay.getInputConnector(dragInfo.field as Parameter)
                    : stepDisplay.getOutputConnector(dragInfo.field as Parameter);
            }
            else {
                let varDisplay = this.getVariableDisplay(dragInfo.field as Variable);
                connector = varDisplay.connector;
            }

            if (dragInfo.input) {
                this.drawFieldLink(dragInfo.field.type, root, dragRect, connector.getBoundingClientRect());
            }
            else {
                this.drawFieldLink(dragInfo.field.type, root, connector.getBoundingClientRect(), dragRect);
            }
        }
    }
    
    private drawProcessLink(
        root: ClientRect | DOMRect,
        begin: ClientRect | DOMRect,
        end: ClientRect | DOMRect
    ) {
        let x1 = begin.right - root.left, y1 = begin.top + begin.height / 2 - root.top;
        let x2 = end.left - root.left, y2 = end.top + end.height / 2 - root.top;

        this.ctx.lineWidth = 4;
        this.ctx.strokeStyle = '#000000';
        this.drawCurve(x1, y1, x2, y2);
    }

    private drawFieldLink(
        type: Type,
        root: ClientRect | DOMRect,
        begin: ClientRect | DOMRect,
        end: ClientRect | DOMRect
    ) {
        let x1 = begin.right - root.left, y1 = begin.top + begin.height / 2 - root.top;
        let x2 = end.left - root.left, y2 = end.top + end.height / 2 - root.top;

        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = type.color;
        this.drawCurve(x1, y1, x2, y2);
    }

    private drawCurve(startX: number, startY: number, endX: number, endY: number) {
        let cpOffset = Math.min(150, Math.abs(endY - startY));

        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.bezierCurveTo(startX + cpOffset, startY, endX - cpOffset, endY, endX, endY);
        this.ctx.stroke();
    }

    private getStepDisplay(step: Step) {
        return this.stepDisplays.get(step)!;
    }

    private getVariableDisplay(variable: Variable) {
        return this.variableDisplays.get(variable)!;
    }

    private updateViewSize() {
        this.setState({
            viewWidth: this.root.offsetWidth,
            viewHeight: this.root.offsetHeight,
            contentWidth: Math.max(this.state.contentWidth, this.root.offsetWidth - this.state.scrollbarWidth),
            contentHeight: Math.max(this.state.contentHeight, this.root.offsetHeight - this.state.scrollbarHeight),
        });
    }

    private updateContentSize() {
        const extraCells = 5;
        let maxX = 0, maxY = 0;

        for (const [, display] of this.stepDisplays) {
            maxX = Math.max(maxX, display.maxX);
            maxY = Math.max(maxY, display.maxY);
        }

        for (const [, display] of this.variableDisplays) {
            maxX = Math.max(maxX, display.maxX);
            maxY = Math.max(maxY, display.maxY);
        }

        let contentWidth = growToFitGrid(maxX);
        let contentHeight = growToFitGrid(maxY);
        
        const viewWidth = this.state.viewWidth - this.state.scrollbarWidth;
        const viewHeight = this.state.viewHeight - this.state.scrollbarHeight;

        if (contentWidth > viewWidth) {
            contentWidth += gridSize * extraCells;
        }
        else {
            contentWidth = viewWidth;
        }
        
        if (contentHeight > viewHeight) {
            contentHeight += gridSize * extraCells;
        }
        else {
            contentHeight = viewHeight;
        }

        this.setState({
            contentWidth: contentWidth,
            contentHeight:  contentHeight,
        });
    }

    private stepDragStart(step: Step, startX: number, startY: number) {
        this.draggingStep = step;
        this.dragX = startX;
        this.dragY = startY;

        this.props.stepDragging(step);
    }

    private varDragStart(variable: Variable, startX: number, startY: number) {
        this.draggingVariable = variable;
        this.dragX = startX;
        this.dragY = startY;

        this.props.variableDragging(variable);
    }

    private dragStop() {
        if (this.props.dropVariableType !== undefined) {
            let dropVariableType = this.props.dropVariableType;
            this.dropNewItem((x, y) => {
                let newVar = new Variable(this.props.process.getNewVariableName(dropVariableType), dropVariableType, x, y);
                this.props.process.variables.push(newVar);
            });
        }

        else if (this.props.dropStep !== undefined) {
            let dropStep = this.props.dropStep;
            this.dropNewItem((x, y) => {
                let newStep = new ProcessStep(this.props.process.getNextStepID(), dropStep, this.props.process, x, y);
                this.props.process.steps.set(newStep.uniqueID, newStep);
            });
        }

        else if (this.props.dropStopStep !== undefined) {
            let dropStopStep = this.props.dropStopStep;
            this.dropNewItem((x, y) => {
                let newStep = new StopStep(this.props.process.getNextStepID(), this.props.process, dropStopStep, x, y);
                this.props.process.steps.set(newStep.uniqueID, newStep);
            });
        }

        else if (this.draggingStep !== undefined) {
            if (!this.props.process.steps.has(this.draggingStep.uniqueID)) {
                return;
            }

            this.stopDraggingItem(this.draggingStep, this.getStepDisplay(this.draggingStep));
            
            this.draggingStep = undefined;
            this.props.stepDragging(undefined);
        }

        else if (this.draggingVariable !== undefined) {
            if (this.props.process.variables.indexOf(this.draggingVariable) === -1) {
                return;
            }

            this.stopDraggingItem(this.draggingVariable, this.getVariableDisplay(this.draggingVariable));

            this.draggingVariable = undefined;
            this.props.variableDragging(undefined);
        }

        else if (this.draggingStepConnector !== undefined) {
            this.draggingStepConnector = undefined;
            this.drawLinks();
        }

        else if (this.draggingParamConnector !== undefined) {
            this.draggingParamConnector = undefined;
            this.drawLinks();
        }

        else {
            return;
        }

        this.dragX = 0;
        this.dragY = 0;
        this.updateContentSize();
    }

    private mouseMove(e: React.MouseEvent<HTMLDivElement>) {
        let dx = e.clientX - this.dragX;
        let dy = e.clientY - this.dragY;
        
        this.dragX = e.clientX;
        this.dragY = e.clientY;

        if (this.draggingStepConnector !== undefined || this.draggingParamConnector !== undefined) {
            this.drawLinks();
        }

        else if (this.draggingStep !== undefined) {
            if (!this.props.process.steps.has(this.draggingStep.uniqueID)) {
                return;
            }

            this.dragItem(dx, dy, this.draggingStep, this.getStepDisplay(this.draggingStep));
        }

        else if (this.draggingVariable !== undefined) {
            if (this.props.process.variables.indexOf(this.draggingVariable) === -1) {
                return;
            }

            this.dragItem(dx, dy, this.draggingVariable, this.getVariableDisplay(this.draggingVariable));
        }
    }

    private dropNewItem(createAction: (x: number, y: number) => void) {
        let root = this.root.getBoundingClientRect();

        // get content-relative coordinates from screen-relative drag coordinates
        let x = alignToGrid(this.dragX - root.left);
        let y = alignToGrid(this.dragY - root.top);

        createAction(x, y);
        this.props.itemDropped();
    }

    private dragItem(dx: number, dy: number, item: Positionable, display: React.Component) {
        item.x += dx;
        item.y += dy;
        
        display.forceUpdate();
        this.drawLinks();
    }

    private stopDraggingItem(item: Positionable, display: React.Component) {

        item.x = alignToGrid(item.x);
        item.y = alignToGrid(item.y);

        display.forceUpdate();
        this.drawLinks();
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
            this.drawLinks();
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
        let prevConnectedSteps = existingPaths.map(path => path.toStep);
        
        for (let existingPath of existingPaths) {
            let removeFrom = existingPath.toStep;
            removeFrom.incomingPaths = removeFrom.incomingPaths.filter(rp => rp.fromStep !== fromStep || rp.name !== returnPath);
        }

        fromStep.returnPaths = fromStep.returnPaths.filter(r => r.name !== returnPath);
        let newPath = new ReturnPath(fromStep, toStep, returnPath);
        fromStep.returnPaths.push(newPath);
        toStep.incomingPaths.push(newPath);

        fromStep.setInvalid();
        toStep.setInvalid();

        this.getStepDisplay(fromStep).forceUpdate();
        this.getStepDisplay(toStep).forceUpdate();
        
        for (let prevConnectedStep of prevConnectedSteps) {
            prevConnectedStep.setInvalid();
            this.getStepDisplay(prevConnectedStep).forceUpdate();
        }

        this.props.revalidate();
        this.drawLinks();
    }

    private fieldLinkDragStart(field: DataField, input?: boolean, step?: Step) {
        this.draggingParamConnector = {
            field: field,
            input: input,
            step: step,
        };
    }

    private fieldLinkDragStop(field: DataField, input?: boolean, step?: Step) {
        if (this.draggingParamConnector === undefined) {
            return;
        }
        
        let dragInfo = this.draggingParamConnector;
        let dropInfo = {
            field: field,
            input: input,
            step: step,
        };

        this.draggingParamConnector = undefined;
        
        if (this.createLink(dragInfo, dropInfo)) {
            if (dragInfo.step !== undefined) {
                dragInfo.step.setInvalid();
                this.getStepDisplay(dragInfo.step).forceUpdate();
            }
            else {
                this.getVariableDisplay(dragInfo.field as Variable).forceUpdate();
            }

            if (dropInfo.step !== undefined) {
                dropInfo.step.setInvalid();
                this.getStepDisplay(dropInfo.step).forceUpdate();
            }
            else {
                this.getVariableDisplay(dropInfo.field as Variable).forceUpdate();
            }
        }

        this.props.revalidate();
        this.drawLinks();
    }

    private createLink(from: ParamConnectorDragInfo, to: ParamConnectorDragInfo) {
        if (from.field === to.field) {
            return false; // mustn't be to/from the same variable
        }

        if (from.input === to.input) {
            return false; // must be from an input to an output, or from a variable to a non-variable
        }

        if (from.input) {
            let tmp = from;
            from = to;
            to = tmp;
        }

        if (from.field.type !== to.field.type && !from.field.type.isAssignableFrom(to.field.type)) {
            return false; // fields must be of the same type, or output type must extend input type
        }

        if ((from.step === undefined) === (to.step === undefined)) {
            return false; // must be between a parameter and a variable, for now
        }

        if (from.step !== undefined && from.step === to.step) {
            return false; // mustn't be on the same step
        }

        let parameter: Parameter;
        let variable: Variable;

        if (from.field instanceof Parameter) {
            parameter = from.field as Parameter;
            variable = to.field as Variable;
        }
        else if (to.field instanceof Parameter) {
            parameter = to.field as Parameter;
            variable = from.field as Variable;
        }
        else {
            return false; // not going to/from any parameter... ?
        }

        if (parameter.link === variable) {
            return false; // they already link, do nothing
        }

        if (parameter.link !== null) {
            let removeFrom = parameter.link.links;
            let index = removeFrom.indexOf(parameter);
            removeFrom.splice(index, 1);
        }

        parameter.link = variable;
        variable.links.push(parameter);

        return true;
    }
}