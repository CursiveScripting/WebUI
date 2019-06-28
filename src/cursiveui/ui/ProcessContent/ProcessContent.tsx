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
    input: boolean;
    step?: Step;
}

interface Coord {
    x: number;
    y: number;
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
                variable={variable}
                key={variable.name}
                initialValueChanged={val => this.variableDefaultChanged(variable, val)}
                nameMouseDown={(x, y) => this.varDragStart(variable, x, y)}
                connectorMouseDown={input => this.fieldLinkDragStart(variable, input, undefined)}
                connectorMouseUp={input => this.fieldLinkDragStop(variable, input, undefined)}
            />
        ));
    }

    private variableDefaultChanged(variable: Variable, value: string | null) {
        variable.initialValue = value === ''
            ? null
            : value;

        this.props.revalidate();
    }

    private drawLinks() {
        this.ctx.clearRect(0, 0, this.state.viewWidth, this.state.viewHeight);
        
        const root = this.root.getBoundingClientRect();
        
        for (const [step, stepDisplay] of this.stepDisplays) {
            for (const path of step.incomingPaths) {
                const beginStepDisplay = this.getStepDisplay(path.fromStep);
                
                const beginConnector = beginStepDisplay.getReturnConnector(path.name);
                const endConnector = stepDisplay.entryConnector;
                
                if (beginConnector !== null && endConnector !== null) {
                    const bounds = step === path.fromStep
                        ? stepDisplay.bounds
                        : undefined;
                    this.drawProcessLink(root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect(), bounds);
                }
            }

            for (let parameter of stepDisplay.props.step.inputs) {
                if (parameter.link === null) {
                    continue;
                }

                let endConnector = stepDisplay.getInputConnector(parameter);

                let variableDisplay = this.getVariableDisplay(parameter.link);
                let beginConnector = variableDisplay.outputConnector;

                this.drawFieldLink(parameter.type, root, beginConnector.getBoundingClientRect(), endConnector.getBoundingClientRect());
            }

            for (let parameter of stepDisplay.props.step.outputs) {
                if (parameter.link === null) {
                    continue;
                }

                let beginConnector = stepDisplay.getOutputConnector(parameter);

                let variableDisplay = this.getVariableDisplay(parameter.link);
                let endConnector = variableDisplay.inputConnector;

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
    }
    
    private drawProcessLink(
        root: ClientRect | DOMRect,
        begin: ClientRect | DOMRect,
        end: ClientRect | DOMRect,
        fitBelow?: ClientRect | DOMRect,
    ) {
        // TODO: if linkToSelf then drawCurve needs to use a down-offset midpoint, somehow.
        // Do we need to pass in the bounds of the step display in question?
        // Or replace linkToSelf with an optional midPoint?

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
            const type = this.props.dropVariableType;
            const dropPos = this.getContentDragCoordinates();
            
            const newVar = new Variable(this.props.process.getNewVariableName(type), type, dropPos.x, dropPos.y);
            this.props.process.variables.push(newVar);

            this.props.itemDropped();
        }

        else if (this.props.dropStep !== undefined) {
            const dropPos = this.getContentDragCoordinates();

            const newStep = new ProcessStep(this.props.process.getNextStepID(), this.props.dropStep, this.props.process, dropPos.x, dropPos.y);
            this.props.process.steps.set(newStep.uniqueID, newStep);

            this.props.itemDropped();
        }

        else if (this.props.dropStopStep !== undefined) {
            const dropPos = this.getContentDragCoordinates();
            
            const newStep = new StopStep(this.props.process.getNextStepID(), this.props.process, this.props.dropStopStep, dropPos.x, dropPos.y);
            this.props.process.steps.set(newStep.uniqueID, newStep);
            
            this.props.itemDropped();
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
            if (this.draggingParamConnector.step !== undefined) {
                const dropPos = this.getContentDragCoordinates();

                const type = this.draggingParamConnector!.field.type;
                let newVar = new Variable(this.props.process.getNewVariableName(type), type, dropPos.x, dropPos.y);
                this.props.process.variables.push(newVar);

                let dragInfo = {
                    field: this.draggingParamConnector!.field,
                    input: this.draggingParamConnector!.input,
                    step: this.draggingParamConnector!.step!,
                };
                
                let dropInfo = {
                    field: newVar,
                    input: !this.draggingParamConnector!.input,
                };
                
                if (this.createLink(dragInfo, dropInfo)) {
                    dragInfo.step.setInvalid();
                    this.getStepDisplay(dragInfo.step).forceUpdate();
                }

                this.draggingParamConnector = undefined;

                this.props.itemDropped();
                this.props.revalidate();
            }
            else {
                this.draggingParamConnector = undefined;
                this.drawLinks();
            }
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

    private screenToGrid(screen: Coord): Coord {
        const root = this.root.getBoundingClientRect();

        return {
            x: alignToGrid(screen.x - root.left),
            y: alignToGrid(screen.y - root.top),
        };
    }

    private getContentDragCoordinates(): Coord {
        return this.screenToGrid({
            x: this.dragX,
            y: this.dragY,
        });
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

        if (dragInfo.input === input) {
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

    private fieldLinkDragStart(field: DataField, input: boolean, step?: Step) {
        this.draggingParamConnector = {
            field: field,
            input: input,
            step: step,
        };
    }

    private fieldLinkDragStop(field: DataField, input: boolean, step?: Step) {
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
    }

    private createLink(from: ParamConnectorDragInfo, to: ParamConnectorDragInfo) {
        if (from.field === to.field) {
            return false; // mustn't be to/from the same variable
        }

        if (from.input === to.input) {
            return false; // must be from an input to an output
        }

        if (from.input) {
            [from, to] = [to, from];
        }

        if (from.field.type !== to.field.type && !from.field.type.isAssignableFrom(to.field.type)) {
            return false; // fields must be of the same type, or output type must extend input type
        }

        if (from.step === to.step) {
            return false; // mustn't be on the same step, or between two variables (which don't have a step)
        }

        if (from.step !== undefined && to.step !== undefined) {
            return this.linkStepsWithVariable(from, to);
        }
        
        if (from.field instanceof Parameter) {
            return this.linkStepToVariable(from.field as Parameter, to.field as Variable);
        }
        
        if (to.field instanceof Parameter) {
            return this.linkStepToVariable(to.field as Parameter, from.field as Variable);
        }
        
        return false; // not going to/from any parameter... ?
    }

    private linkStepToVariable(parameter: Parameter, variable: Variable) {
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

    private linkStepsWithVariable(from: ParamConnectorDragInfo, to: ParamConnectorDragInfo) {
        const type = to.field.type;

        const fromPos = this.stepDisplays
            .get(from.step!)!
            .getOutputConnector(from.field as Parameter)
            .getBoundingClientRect();

        const toPos = this.stepDisplays
            .get(to.step!)!
            .getInputConnector(to.field as Parameter)
            .getBoundingClientRect();

        const dropPos = this.screenToGrid({
            x: (fromPos.left + fromPos.right + toPos.left + toPos.right) / 4,
            y: (fromPos.top + fromPos.bottom + toPos.top + toPos.bottom) / 4,
        });

        const newVar = new Variable(this.props.process.getNewVariableName(type), type, dropPos.x, dropPos.y);
        this.props.process.variables.push(newVar);

        this.props.itemDropped();

        return this.linkStepToVariable(from.field as Parameter, newVar)
            && this.linkStepToVariable(to.field as Parameter, newVar);
    }
}