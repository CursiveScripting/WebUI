import * as React from 'react';
import { Step, ReturnPath, Type, Variable, DataField, Process, Parameter, StepType } from '../../data';
import { getScrollbarSize } from '../getScrollbarSize';
import { gridSize, growToFitGrid, alignToGrid } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import { Positionable } from '../../data/Positionable';
import './ProcessContent.css';
import { LinkCanvas, DragInfo } from './LinkCanvas';
import { ScrollWrapper } from './ScrollWrapper';

interface Props {
    steps: Step[];
    variables: Variable[];
    
    addStep: (process: Process, x: number, y: number) => void;
    addStopStep: (returnPath: string | null, x: number, y: number) => void;
    addVariable: (type: Type, x: number, y: number) => Variable;

    removeStep: (step: Step) => void;
    removeVariable: (variable: Variable) => void;
    
    className?: string;
    dropVariableType?: Type;
    dropStep?: Process;
    dropStopStep?: string | null;
    focusStep?: Step;
    focusStepParameter?: Parameter;
    focusStepReturnPath?: string | null;
    stepDragging: (step: Step | undefined) => void; // TODO: remove this. Only needed for bin.
    variableDragging: (variable: Variable | undefined) => void; // TODO: remove this. Only needed for bin.
    revalidate: () => void;
}

interface State {
    viewWidth: number;
    viewHeight: number;
    contentWidth: number;
    contentHeight: number;
    scrollbarWidth: number;
    scrollbarHeight: number;
}

export interface StepConnectorDragInfo {
    step: Step;
    input: boolean;
    returnPath: string | null;
}

export interface ParamConnectorDragInfo {
    field: DataField;
    input: boolean;
    step?: Step;
}

export interface Coord {
    x: number;
    y: number;
}

export class ProcessContent extends React.PureComponent<Props, State> {
    private root: HTMLDivElement = undefined as unknown as HTMLDivElement;
    private canvas: LinkCanvas | null = null;
    private resizeListener?: () => void;
    private draggingStep?: Step;
    private draggingVariable?: Variable;
    private draggingStepConnector?: StepConnectorDragInfo;
    private draggingParamConnector?: ParamConnectorDragInfo;
    private dragX: number = 0;
    private dragY: number = 0;
    private readonly stepDisplays = new Map<Step, StepDisplay>();
    private readonly variableDisplays = new Map<Variable, VariableDisplay>();

    constructor(props: Props) {
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
        const classes = this.props.className === undefined
            ? 'processContent'
            : `processContent ${this.props.className}`;
        
        const canvasWidth = this.state.viewWidth < this.state.contentWidth
            ? this.state.viewWidth - this.state.scrollbarWidth
            : this.state.viewWidth;

        const canvasHeight = this.state.viewHeight < this.state.contentHeight
            ? this.state.viewHeight - this.state.scrollbarHeight
            : this.state.viewHeight;

        const dragging: DragInfo | undefined = this.draggingStepConnector !== undefined
            ? {
                isParam: false,
                pathInfo: this.draggingStepConnector,
                x: this.dragX,
                y: this.dragY,
            }
            : this.draggingParamConnector !== undefined
                ? {
                    isParam: true,
                    paramInfo: this.draggingParamConnector,
                    x: this.dragX,
                    y: this.dragY,
                }
                : undefined;

        return (
            <div
                className={classes}
                ref={r => { if (r !== null) { this.root = r; }}}
                onMouseMove={e => this.mouseMove(e)}
                onMouseUp={e => this.dragStop()}
            >
                <LinkCanvas
                    className="processContent__canvas"
                    width={canvasWidth}
                    height={canvasHeight}
                    stepDisplays={this.stepDisplays}
                    variableDisplays={this.variableDisplays}
                    dragging={dragging}
                    ref={c => this.canvas = c}
                />

                <ScrollWrapper
                    rootClassName="processContent__scrollWrapper"
                    backgroundClassName="processContent__backgroundScroll" 
                    scrollRootClassName="processContent__scrollRoot"
                    width={this.state.contentWidth}
                    height={this.state.contentHeight}
                    onScroll={() => this.canvas!.drawLinks()}
                >
                    {this.renderSteps()}
                    {this.renderVariables()}
                </ScrollWrapper>
            </div>
        );
    }

    componentDidMount() {
        this.resizeListener = () => this.updateViewSize();
        window.addEventListener('resize', this.resizeListener);
    
        this.updateViewSize();
        this.canvas!.drawLinks();
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevProps.focusStep === undefined && this.props.focusStep !== undefined) {
            this.getStepDisplay(this.props.focusStep).scrollIntoView();
        }

        this.canvas!.drawLinks();
    }
    
    componentWillUnmount() {
        if (this.resizeListener !== undefined) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }
    
    private renderSteps() {
        this.stepDisplays.clear();

        return this.props.steps.map(step => (
            <StepDisplay
                ref={s => { if (s !== null) { this.stepDisplays.set(step, s); } else { this.stepDisplays.delete(step); }}}
                key={step.uniqueID}
                step={step}
                focused={step === this.props.focusStep}
                focusParameter={this.props.focusStepParameter}
                focusReturnPath={this.props.focusStepReturnPath}
                readonly={false}
                deleteClicked={step.stepType === StepType.Start ? undefined : () => this.props.removeStep(step)}
                headerMouseDown={(x, y) => this.stepDragStart(step, x, y)}
                inputLinkMouseDown={() => this.stepLinkDragStart(step, true, null)}
                outputLinkMouseDown={returnPath => this.stepLinkDragStart(step, false, returnPath)}
                inputLinkMouseUp={() => this.stepLinkDragStop(step, true, null)}
                outputLinkMouseUp={returnPath => this.stepLinkDragStop(step, false, returnPath)}
                parameterLinkMouseDown={(param, input) => this.fieldLinkDragStart(param, input, step)}
                parameterLinkMouseUp={(param, input) => this.fieldLinkDragStop(param, input, step)}
            />
        ));
    }
    
    private renderVariables() {
        this.variableDisplays.clear();

        return this.props.variables.map(variable => (
            <VariableDisplay
                ref={v => { if (v !== null) { this.variableDisplays.set(variable, v); } else { this.variableDisplays.delete(variable); }}}
                variable={variable}
                key={variable.name}
                deleteClicked={() => this.props.removeVariable(variable)}
                initialValueChanged={val => this.variableDefaultChanged(variable, val)}
                headerMouseDown={(x, y) => this.varDragStart(variable, x, y)}
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
            const dropPos = this.getContentDragCoordinates();
            
            this.props.addVariable(this.props.dropVariableType, dropPos.x, dropPos.y);
        }

        else if (this.props.dropStep !== undefined) {
            const dropPos = this.getContentDragCoordinates();

            this.props.addStep(this.props.dropStep!, dropPos.x, dropPos.y);
        }

        else if (this.props.dropStopStep !== undefined) {
            const dropPos = this.getContentDragCoordinates();

            this.props.addStopStep(this.props.dropStopStep, dropPos.x, dropPos.y);
        }

        else if (this.draggingStep !== undefined) {
            this.stopDraggingItem(this.draggingStep);
            
            this.draggingStep = undefined;
            this.props.stepDragging(undefined);
        }

        else if (this.draggingVariable !== undefined) {
            this.stopDraggingItem(this.draggingVariable);

            this.draggingVariable = undefined;
            this.props.variableDragging(undefined);
        }

        else if (this.draggingStepConnector !== undefined) {
            this.draggingStepConnector = undefined;
            this.canvas!.drawLinks();
        }

        else if (this.draggingParamConnector !== undefined) {
            if (this.draggingParamConnector.step !== undefined) {
                const dropPos = this.getContentDragCoordinates();

                const newVar = this.props.addVariable(this.draggingParamConnector!.field.type, dropPos.x, dropPos.y);

                const dragInfo = {
                    field: this.draggingParamConnector!.field,
                    input: this.draggingParamConnector!.input,
                    step: this.draggingParamConnector!.step!,
                };
                
                const dropInfo = {
                    field: newVar,
                    input: !this.draggingParamConnector!.input,
                };
                
                if (this.createLink(dragInfo, dropInfo)) {
                    dragInfo.step.setInvalid();
                    this.getStepDisplay(dragInfo.step).forceUpdate();
                }

                this.draggingParamConnector = undefined;

                this.props.revalidate();
            }
            else {
                this.draggingParamConnector = undefined;
                this.canvas!.drawLinks();
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
            // TODO: without forcing a re-render, the updated dragX / dragY don't propagate to the LinkCanvas
            // ... if we split everything into separate components such that this component's render method is dead simple,
            // then dragX / dragY could be state here.
            this.canvas!.drawLinks();
        }

        else if (this.draggingStep !== undefined) {
            this.dragItem(dx, dy, this.draggingStep, this.getStepDisplay(this.draggingStep));
        }

        else if (this.draggingVariable !== undefined) {
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
        this.canvas!.drawLinks();
    }

    private stopDraggingItem(item: Positionable) {
        item.x = alignToGrid(item.x);
        item.y = alignToGrid(item.y);

        this.canvas!.drawLinks();
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
            this.canvas!.drawLinks();
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
        this.canvas!.drawLinks();
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

        const newVar = this.props.addVariable(to.field.type, dropPos.x, dropPos.y);

        return this.linkStepToVariable(from.field as Parameter, newVar)
            && this.linkStepToVariable(to.field as Parameter, newVar);
    }
}