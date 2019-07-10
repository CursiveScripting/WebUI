import * as React from 'react';
import { alignToGrid, growToFitGrid, gridSize } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import './ProcessContent.css';
import { LinkCanvas, LinkDragInfo } from './LinkCanvas';
import { ScrollWrapper } from './ScrollWrapper';
import { VariablesDisplay } from './VariablesDisplay';
import { StepsDisplay } from './StepsDisplay';
import { ContentWrapper } from './ContentWrapper';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { IStep } from '../../workspaceState/IStep';
import { IVariable } from '../../workspaceState/IVariable';
import { IProcess } from '../../workspaceState/IProcess';
import { IType } from '../../workspaceState/IType';
import { IParameter } from '../../workspaceState/IParameter';
import { IPositionable } from '../../workspaceState/IPositionable';
import { determineVariableName } from '../../services/StepFunctions';
import { IFullStep } from './IFullStep';

interface Props {
    processName: string;
    steps: IFullStep[];
    variables: IVariable[];
    typesByName: Map<string, IType>;
    
    className?: string;
    
    dropVariableType?: IType;
    dropStep?: IProcess;
    dropStopStep?: string | null;

    dropComplete: () => void;

    focusStep?: IStep;
    focusStepParameter?: IParameter;
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
    step: IStep;
    input: boolean;
    returnPath: string | null;
}

export interface ParamConnectorDragInfo {
    field: IParameter | IVariable;
    type: IType;
    input: boolean;
    step?: IStep;
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
    step: IStep;
} | {
    type: DragType.Variable;
    x: number;
    y: number;
    variable: IVariable;
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
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;

    private canvas: LinkCanvas | null = null;
    private readonly stepDisplays = new Map<string, StepDisplay>();
    private readonly variableDisplays = new Map<string, VariableDisplay>();

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
                    steps={this.props.steps}
                    variables={this.props.variables}
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
                        processName={this.props.processName}
                        steps={this.props.steps}
                        refs={this.stepDisplays}

                        focusStep={this.props.focusStep}
                        focusParameter={this.props.focusStepParameter}
                        focusReturnPath={this.props.focusStepReturnPath}

                        /*
                        TODO: still need to report these out
                        startDragParameter={}
                        startDragPath={}
                        */
                    />
                    
                    <VariablesDisplay
                        variables={this.props.variables}
                        refs={this.variableDisplays}
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
        
    private variableDefaultChanged(variable: IVariable, value: string | null) {
        variable.initialValue = value === ''
            ? null
            : value;

        this.props.revalidate();
    }

    private getStepDisplay(step: IStep) {
        return this.stepDisplays.get(step.uniqueId)!;
    }

    private getVariableDisplay(variable: IVariable) {
        return this.variableDisplays.get(variable.name)!;
    }

    private varDragStart(variable: IVariable, startX: number, startY: number) {
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

                    const newVarName = determineVariableName(connector.field.typeName, this.props.variables)
                    
                    this.context({
                        type: 'add variable',
                        inProcessName: this.props.processName,
                        typeName: connector.field.typeName,
                        varName: newVarName,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    const dragInfo = connector;
                    
                    const dropInfo = {
                        field: newVarName,
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
                    this.context({
                        type: 'add step',
                        inProcessName: this.props.processName,
                        stepProcessName: this.props.dropStep.name,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropVariableType !== undefined) {
                    this.context({
                        type: 'add variable',
                        inProcessName: this.props.processName,
                        typeName: this.props.dropVariableType.name,
                        varName: determineVariableName(this.props.dropVariableType.name, this.props.variables),
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropStopStep !== undefined) {
                    this.context({
                        type: 'add stop step',
                        inProcessName: this.props.processName,
                        returnPath: this.props.dropStopStep,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
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

    private dragItem(dx: number, dy: number, item: IPositionable, display: React.Component) {
        item.x += dx;
        item.y += dy;
        
        display.forceUpdate();
        this.canvas!.drawLinks();
    }

    private stopDraggingItem(item: IPositionable) {
        item.x = alignToGrid(item.x);
        item.y = alignToGrid(item.y);

        this.canvas!.drawLinks();
    }

    private fieldLinkDragStart(field: IParameter | IVariable, input: boolean, x: number, y: number, step?: IStep) {
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

    private fieldLinkDragStop(field: IParameter | IVariable, input: boolean, step?: IStep) {
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
                this.getVariableDisplay(dragInfo.paramConnector.field as IVariable).forceUpdate();
            }

            if (dropInfo.step !== undefined) {
                dropInfo.step.setInvalid();
                this.getStepDisplay(dropInfo.step).forceUpdate();
            }
            else {
                this.getVariableDisplay(dropInfo.field as IVariable).forceUpdate();
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
        
        if (from.field instanceof IParameter) {
            return this.linkStepToVariable(from.field as IParameter, to.field as IVariable);
        }
        
        if (to.field instanceof IParameter) {
            return this.linkStepToVariable(to.field as IParameter, from.field as IVariable);
        }
        
        return false; // not going to/from any parameter... ?
    }

    private linkStepToVariable(parameter: IParameter, variable: IVariable) {
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
            .getOutputConnector(from.field as IParameter)
            .getBoundingClientRect();

        const toPos = this.stepDisplays
            .get(to.step!)!
            .getInputConnector(to.field as IParameter)
            .getBoundingClientRect();

        const dropPos = this.screenToGrid({
            x: (fromPos.left + fromPos.right + toPos.left + toPos.right) / 4,
            y: (fromPos.top + fromPos.bottom + toPos.top + toPos.bottom) / 4,
        });

        const newVar = this.props.addVariable(to.field.type, dropPos.x, dropPos.y);

        return this.linkStepToVariable(from.field as IParameter, newVar)
            && this.linkStepToVariable(to.field as IParameter, newVar);
    }
}