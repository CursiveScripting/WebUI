import * as React from 'react';
import { Step, ReturnPath, Type, Variable, DataField, Process, Parameter } from '../../data';
import { alignToGrid, growToFitGrid, gridSize } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import { Positionable } from '../../workspaceState/IPositionable';
import './ProcessContent.css';
import { LinkCanvas, LinkDragInfo } from './LinkCanvas';
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
    dragging?: DragInfo;
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

enum DragType {
    Step,
    Variable,
    StepConnector,
    ParamConnector,
    DropNew,
}

type DragInfo = {
    type: DragType.Step;
    x: number;
    y: number;
    step: Step;
} | {
    type: DragType.Variable;
    x: number;
    y: number;
    variable: Variable;
} | {
    type: DragType.StepConnector;
    x: number;
    y: number;
    stepConnector: StepConnectorDragInfo;
} | {
    type: DragType.ParamConnector;
    x: number;
    y: number;
    paramConnector: ParamConnectorDragInfo;
} | {
    type: DragType.DropNew;
    x: number;
    y: number;
}

export class ProcessContent extends React.PureComponent<Props, State> {
    private canvas: LinkCanvas | null = null;
    private readonly stepDisplays = new Map<Step, StepDisplay>();
    private readonly variableDisplays = new Map<Variable, VariableDisplay>();

    constructor(props: Props) {
        super(props);

        this.state = {
            canvasWidth: 0,
            canvasHeight: 0,
            contentWidth: 0,
            contentHeight: 0,
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

        const dragging: LinkDragInfo | undefined = this.state.dragging === undefined
            ? undefined
            : this.state.dragging.type === DragType.StepConnector
                ? {
                    isParam: false,
                    pathInfo: this.state.dragging.stepConnector,
                    x: this.state.dragging.x,
                    y: this.state.dragging.y,
                }
                : this.state.dragging.type === DragType.ParamConnector
                    ? {
                    isParam: true,
                    paramInfo: this.state.dragging.paramConnector,
                    x: this.state.dragging.x,
                    y: this.state.dragging.y,
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

                        startDragInputPath={(step, x, y) => this.stepLinkDragStart(step, x, y, true, null)}
                        stopDragInputPath={step => this.stepLinkDragStop(step, true, null)}
                    
                        startDragReturnPath={(step, path, x, y) => this.stepLinkDragStart(step, x, y, false, path)}
                        stopDragReturnPath={(step, path) => this.stepLinkDragStop(step, false, path)}
                    
                        startDragConnector={(param, step, x, y, input) => this.fieldLinkDragStart(param, input, x, y, step)}
                        stopDragConnector={(param, step, input) => this.fieldLinkDragStop(param, input, step)}
                    />
                    
                    <VariablesDisplay
                        variables={this.props.variables}
                        refs={this.variableDisplays}
                        removeVariable={variable => this.props.removeVariable(variable)}
                        initialValueChanged={(variable, val) => this.variableDefaultChanged(variable, val)}

                        startDragHeader={(variable, x, y) => this.varDragStart(variable, x, y)}

                        startDragConnector={(variable, input, x, y) => this.fieldLinkDragStart(variable, input, x, y, undefined)}
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

        if ((nextProps.dropStep !== undefined && this.props.dropStep === undefined)
            || (nextProps.dropStopStep !== undefined && this.props.dropStopStep === undefined)
            || (nextProps.dropVariableType !== undefined && this.props.dropVariableType === undefined)) {
            this.setState({
                dragging: {
                    type: DragType.DropNew,
                    x: 0, // TODO: this this work with 0,0 coordinates?
                    y: 0,
                }
            });
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
        this.setState({
            dragging: {
                type: DragType.Step,
                step,
                x: startX,
                y: startY,
            }
        });
    }

    private varDragStart(variable: Variable, startX: number, startY: number) {
        this.setState({
            dragging: {
                type: DragType.Variable,
                variable,
                x: startX,
                y: startY,
            }
        });
    }

    private dragStop() {
        const dragging = this.state.dragging;
        if (dragging === undefined) {
            return;
        }

        this.setState({
            dragging: undefined,
        });

        switch (dragging.type) {
            case DragType.Step:
                this.stopDraggingItem(dragging.step);
                this.updateContentSize();
                break;
            case DragType.Variable:
                this.stopDraggingItem(dragging.variable);
                this.updateContentSize();
                break;
            case DragType.StepConnector:
                this.canvas!.drawLinks(); // stop drawing this link ... it will be abandoned
                break;
            case DragType.ParamConnector:
                const connector = dragging.paramConnector;
                if (connector.step !== undefined) {
                    const gridDropPos = this.screenToGrid(dragging);

                    const newVar = this.props.addVariable(connector.field.type, gridDropPos.x, gridDropPos.y);

                    const dragInfo = connector;
                    
                    const dropInfo = {
                        field: newVar,
                        input: !connector.input,
                    };
                    
                    if (this.createLink(dragInfo, dropInfo)) {
                        connector.step.setInvalid();
                        this.getStepDisplay(connector.step).forceUpdate();
                    }

                    this.props.revalidate();
                }
                else {
                    this.canvas!.drawLinks();
                }
                break;
            case DragType.DropNew:
                const gridDropPos = this.screenToGrid(dragging);

                if (this.props.dropStep !== undefined) {
                    this.props.addStep(this.props.dropStep!, gridDropPos.x, gridDropPos.y);
                }
                else if (this.props.dropVariableType !== undefined) {
                    this.props.addVariable(this.props.dropVariableType, gridDropPos.x, gridDropPos.y);
                }
                else if (this.props.dropStopStep !== undefined) {
                    this.props.addStopStep(this.props.dropStopStep, gridDropPos.x, gridDropPos.y);
                }
                break;
        }
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
        const dragging = this.state.dragging;
        if (dragging === undefined) {
            return;
        }

        let dx = e.clientX - dragging.x;
        let dy = e.clientY - dragging.y;
        
        this.setState(prev => {
            const dragging = {...prev.dragging} as DragInfo;
            dragging.x = e.clientX;
            dragging.y = e.clientY;

            return {
                dragging,
            };
        });

        if (dragging.type === DragType.Step) {
            this.dragItem(dx, dy, dragging.step, this.getStepDisplay(dragging.step));
        }
        else if (dragging.type === DragType.Variable) {
            this.dragItem(dx, dy, dragging.variable, this.getVariableDisplay(dragging.variable));
        }
    }

    private screenToGrid(screen: Coord): Coord {
        return {
            x: alignToGrid(screen.x - this.state.minScreenX),
            y: alignToGrid(screen.y - this.state.minScreenY),
        };
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

    private stepLinkDragStart(step: Step, x: number, y: number, input: boolean, returnPath: string | null) {
        this.setState({
            dragging: {
                type: DragType.StepConnector,
                stepConnector: {
                    step: step,
                    input: input,
                    returnPath: returnPath,
                },
                x,
                y,
            }
        });
    }

    private stepLinkDragStop(step: Step, input: boolean, returnPath: string | null) {
        if (this.state.dragging === undefined) {
            return;
        }

        const dragInfo = this.state.dragging;

        if (dragInfo.type !== DragType.StepConnector) {
            return;
        }

        this.setState({
            dragging: undefined,
        })

        if (dragInfo.stepConnector.input === input) {
            this.canvas!.drawLinks();
            return;
        }

        let fromStep: Step, toStep: Step;
        if (input) {
            fromStep = dragInfo.stepConnector.step;
            toStep = step;
            returnPath = dragInfo.stepConnector.returnPath;
        }
        else {
            fromStep = step;
            toStep = dragInfo.stepConnector.step;
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

    private fieldLinkDragStart(field: DataField, input: boolean, x: number, y: number, step?: Step) {
        this.setState({
            dragging: {
                type: DragType.ParamConnector,
                paramConnector: {
                    field: field,
                    input: input,
                    step: step,
                },
                x,
                y,
            }
        });
    }

    private fieldLinkDragStop(field: DataField, input: boolean, step?: Step) {
        if (this.state.dragging === undefined) {
            return;
        }
        
        const dragInfo = this.state.dragging;

        if (dragInfo.type !== DragType.ParamConnector) {
            return;
        }

        let dropInfo = {
            field: field,
            input: input,
            step: step,
        };

        this.setState({
            dragging: undefined,
        })
        
        if (this.createLink(dragInfo.paramConnector, dropInfo)) {
            if (dragInfo.paramConnector.step !== undefined) {
                dragInfo.paramConnector.step.setInvalid();
                this.getStepDisplay(dragInfo.paramConnector.step).forceUpdate();
            }
            else {
                this.getVariableDisplay(dragInfo.paramConnector.field as Variable).forceUpdate();
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