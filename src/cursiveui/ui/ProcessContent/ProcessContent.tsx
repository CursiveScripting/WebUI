import * as React from 'react';
import { Step, ReturnPath, Type, Variable, DataField, Process, Parameter } from '../../data';
import { alignToGrid, growToFitGrid, gridSize } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import { Positionable } from '../../data/Positionable';
import './ProcessContent.css';
import { LinkCanvas, DragInfo } from './LinkCanvas';
import { ScrollWrapper } from './ScrollWrapper';
import { VariablesDisplay } from './VariablesDisplay';
import { StepsDisplay } from './StepsDisplay';
import { ContentWrapper } from './ContentWrapper';

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
    revalidate: () => void;
}

interface State {
    contentWidth: number;
    contentHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    dragX: number;
    dragY: number;
    minScreenX: number;
    minScreenY: number;
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
    private canvas: LinkCanvas | null = null;
    private draggingStep?: Step; // TODO: add to state
    private draggingVariable?: Variable; // TODO: add to state
    private draggingStepConnector?: StepConnectorDragInfo;
    private draggingParamConnector?: ParamConnectorDragInfo;
    private readonly stepDisplays = new Map<Step, StepDisplay>();
    private readonly variableDisplays = new Map<Variable, VariableDisplay>();

    constructor(props: Props) {
        super(props);

        this.state = {
            canvasWidth: 0,
            canvasHeight: 0,
            contentWidth: 0,
            contentHeight: 0,
            dragX : 0,
            dragY : 0,
            minScreenX: 0,
            minScreenY: 0,
        };
    }

    componentDidMount() {
        this.updateContentSize();
    }

    render() {
        const classes = this.props.className === undefined
            ? 'processContent'
            : `processContent ${this.props.className}`;

        const dragging: DragInfo | undefined = this.draggingStepConnector !== undefined
            ? {
                isParam: false,
                pathInfo: this.draggingStepConnector,
                x: this.state.dragX,
                y: this.state.dragY,
            }
            : this.draggingParamConnector !== undefined
                ? {
                    isParam: true,
                    paramInfo: this.draggingParamConnector,
                    x: this.state.dragX,
                    y: this.state.dragY,
                }
                : undefined;

        return (
            <ContentWrapper
                className={classes}
                contentWidth={this.state.contentWidth}
                contentHeight={this.state.contentHeight}
                setScreenOffset={(x, y) => this.setState({ minScreenX: x, minScreenY: y })}
                setDisplayExtent={(w, h) => this.setState({ canvasWidth: w, canvasHeight: h })}
                onMouseMove={e => this.mouseMove(e)}
                onMouseUp={e => this.dragStop()}
            >
                <LinkCanvas
                    className="processContent__canvas"
                    width={this.state.canvasWidth}
                    height={this.state.canvasHeight}
                    stepDisplays={this.stepDisplays}
                    variableDisplays={this.variableDisplays}
                    dragging={dragging}
                    ref={c => this.canvas = c}
                />

                <ScrollWrapper
                    rootClassName="processContent__scrollWrapper"
                    backgroundClassName="processContent__backgroundScroll" 
                    scrollRootClassName="processContent__scrollRoot"
                    width={Math.max(this.state.contentWidth, this.state.canvasWidth)}
                    height={Math.max(this.state.contentHeight, this.state.canvasHeight)}
                    onScroll={() => this.canvas!.drawLinks()}
                >
                    <StepsDisplay
                        steps={this.props.steps}
                        refs={this.stepDisplays}

                        focusStep={this.props.focusStep}
                        focusParameter={this.props.focusStepParameter}
                        focusReturnPath={this.props.focusStepReturnPath}
                        removeStep={step => this.props.removeStep(step)}

                        startDragHeader={(step, x, y) => this.stepDragStart(step, x, y)}

                        startDragInputPath={step => this.stepLinkDragStart(step, true, null)}
                        stopDragInputPath={step => this.stepLinkDragStop(step, true, null)}
                    
                        startDragReturnPath={(step, path) => this.stepLinkDragStart(step, false, path)}
                        stopDragReturnPath={(step, path) => this.stepLinkDragStop(step, false, path)}
                    
                        startDragConnector={(param, step, input) => this.fieldLinkDragStart(param, input, step)}
                        stopDragConnector={(param, step, input) => this.fieldLinkDragStop(param, input, step)}
                    />
                    
                    <VariablesDisplay
                        variables={this.props.variables}
                        refs={this.variableDisplays}
                        removeVariable={variable => this.props.removeVariable(variable)}
                        initialValueChanged={(variable, val) => this.variableDefaultChanged(variable, val)}

                        startDragHeader={(variable, x, y) => this.varDragStart(variable, x, y)}

                        startDragConnector={(variable, input) => this.fieldLinkDragStart(variable, input, undefined)}
                        stopDragConnector={(variable, input) => this.fieldLinkDragStop(variable, input, undefined)}
                    />
                </ScrollWrapper>
            </ContentWrapper>
        );
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.steps.length !== this.props.steps.length
            || nextProps.variables.length !== this.props.variables.length) {
            this.updateContentSize();
        }
    }

    componentDidUpdate(prevProps: Props, prevState: State) {
        if (prevProps.focusStep === undefined && this.props.focusStep !== undefined) {
            this.getStepDisplay(this.props.focusStep).scrollIntoView();
        }
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

    private stepDragStart(step: Step, startX: number, startY: number) {
        this.draggingStep = step;
        this.setState({
            dragX: startX,
            dragY: startY,
        });
    }

    private varDragStart(variable: Variable, startX: number, startY: number) {
        this.draggingVariable = variable;
        this.setState({
            dragX: startX,
            dragY: startY,
        });
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
            this.updateContentSize();
        }

        else if (this.draggingVariable !== undefined) {
            this.stopDraggingItem(this.draggingVariable);

            this.draggingVariable = undefined;
            this.updateContentSize();
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

        this.setState({
            dragX: 0,
            dragY: 0,
        });
    }

    private updateContentSize() {
        let maxX = 0, maxY = 0;

        for (const [, display] of this.stepDisplays) {
            maxX = Math.max(maxX, display.maxX);
            maxY = Math.max(maxY, display.maxY);
        }

        for (const [, display] of this.variableDisplays) {
            maxX = Math.max(maxX, display.maxX);
            maxY = Math.max(maxY, display.maxY);
        }

        const extraCells = 5;
        
        this.setState({
            contentWidth: growToFitGrid(maxX) + gridSize * extraCells,
            contentHeight: growToFitGrid(maxY) + gridSize * extraCells,
        })
    }

    private mouseMove(e: React.MouseEvent<HTMLDivElement>) {
        let dx = e.clientX - this.state.dragX;
        let dy = e.clientY - this.state.dragY;
        
        this.setState({
            dragX: e.clientX,
            dragY: e.clientY,
        });

        if (this.draggingStep !== undefined) {
            this.dragItem(dx, dy, this.draggingStep, this.getStepDisplay(this.draggingStep));
        }
        else if (this.draggingVariable !== undefined) {
            this.dragItem(dx, dy, this.draggingVariable, this.getVariableDisplay(this.draggingVariable));
        }
    }

    private screenToGrid(screen: Coord): Coord {
        return {
            x: alignToGrid(screen.x - this.state.minScreenX),
            y: alignToGrid(screen.y - this.state.minScreenY),
        };
    }

    private getContentDragCoordinates(): Coord {
        return this.screenToGrid({
            x: this.state.dragX,
            y: this.state.dragY,
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