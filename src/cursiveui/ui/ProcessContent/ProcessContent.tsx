import * as React from 'react';
import { alignToGrid, growToFitGrid, gridSize } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import './ProcessContent.css';
import { LinkCanvas, LinkDragInfo } from './LinkCanvas';
import { ScrollWrapper } from './ScrollWrapper';
import { ContentItems } from './ContentItems';
import { ContentWrapper } from './ContentWrapper';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { IStep } from '../../workspaceState/IStep';
import { IVariable } from '../../workspaceState/IVariable';
import { IProcess } from '../../workspaceState/IProcess';
import { IType } from '../../workspaceState/IType';
import { IParameter } from '../../workspaceState/IParameter';
import { determineVariableName } from '../../services/StepFunctions';
import { IStepDisplay, IStepDisplayParam, populateStepDisplay } from './IStepDisplay';
import { IVariableDisplay, populateVariableDisplay } from './IVariableDisplay';
import { IUserProcess } from '../../workspaceState/IUserProcess';

interface Props {
    openProcess: IUserProcess;
    typesByName: Map<string, IType>;
    processesByName: Map<string, IProcess>;

    className?: string;
    
    dropVariableType?: IType;
    dropStep?: IProcess;
    dropStopStep?: string | null;
    dropComplete: () => void;

    focusStep?: IStep;
    focusStepParameter?: IStepDisplayParam; // This will have to change type
    focusStepReturnPath?: string | null;
    focusVariableName?: string;
    revalidate: () => void;
}

interface State {
    steps: IStepDisplay[];
    variables: IVariableDisplay[];

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

export interface ICoord {
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
            steps: this.populateSteps(props),
            variables: this.populateVariables(props),
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

    private populateSteps(props: Props) {
        return props.openProcess.steps.map(s => populateStepDisplay(s, props.openProcess, props.processesByName, props.typesByName))
    }

    private populateVariables(props: Props) {
        return props.openProcess.variables.map(v => populateVariableDisplay(v, props.openProcess, props.typesByName))
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
                    steps={this.state.steps}
                    variables={this.state.variables}
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
                    <ContentItems
                        processName={this.props.openProcess.name}
                        steps={this.state.steps}
                        variables={this.state.variables}
                        varRefs={this.variableDisplays}
                        stepRefs={this.stepDisplays}

                        focusStepId={this.props.focusStep === undefined ? undefined : this.props.focusStep.uniqueId}
                        focusParameter={this.props.focusStepParameter}
                        focusReturnPath={this.props.focusStepReturnPath}
                        focusVariableName={this.props.focusVariableName}
                    />
                </ScrollWrapper>
            </ContentWrapper>
        );
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.openProcess.steps !== this.props.openProcess.steps
            || nextProps.processesByName !== this.props.processesByName
            || nextProps.typesByName !== this.props.typesByName) {
            this.setState({
                steps: this.populateSteps(nextProps),
            })
        }

        if (nextProps.openProcess.variables !== this.props.openProcess.variables
            || nextProps.typesByName  !== this.props.typesByName) {
            this.setState({
                variables: this.populateVariables(nextProps),
            })
        }

        if (nextProps.openProcess !== this.props.openProcess
            || nextProps.openProcess.steps.length !== this.state.steps.length
            || nextProps.openProcess.variables.length !== this.state.variables.length) {
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
            this.stepDisplays.get(this.props.focusStep.uniqueId)!.scrollIntoView();
        }
        if (prevProps.focusVariableName === undefined && this.props.focusVariableName !== undefined) {
            this.variableDisplays.get(this.props.focusVariableName)!.scrollIntoView();
        }
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
            case DragType.StepConnector:
                this.canvas!.drawLinks(); // stop drawing this link ... it will be abandoned
                break;
            case DragType.ParamConnector:
                const connector = dragging.paramConnector;
                if (connector.step !== undefined) {
                    const gridDropPos = this.screenToGrid(dragging);

                    const newVarName = determineVariableName(connector.field.typeName, this.state.variables)
                    
                    // TODO: combine these into a single action, to allow undoing in a single step?
                    this.context({
                        type: 'add variable',
                        inProcessName: this.props.openProcess.name,
                        typeName: connector.field.typeName,
                        varName: newVarName,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });
                    
                    this.context({
                        type: 'link variable',
                        inProcessName: this.props.openProcess.name,
                        stepId: connector.step.uniqueId,
                        stepInputParam: connector.input,
                        stepParamName: connector.field.name,
                        varName: newVarName,
                    })
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
                        inProcessName: this.props.openProcess.name,
                        stepProcessName: this.props.dropStep.name,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropVariableType !== undefined) {
                    this.context({
                        type: 'add variable',
                        inProcessName: this.props.openProcess.name,
                        typeName: this.props.dropVariableType.name,
                        varName: determineVariableName(this.props.dropVariableType.name, this.state.variables),
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropStopStep !== undefined) {
                    this.context({
                        type: 'add stop step',
                        inProcessName: this.props.openProcess.name,
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

        const x = e.clientX;
        const y = e.clientY;

        this.setState(prev => {
            return {
                dragging: {
                    ...prev.dragging,
                    x,
                    y,
                } as DragInfo,
            };
        });
    }

    private screenToGrid(screen: ICoord): ICoord {
        return {
            x: alignToGrid(screen.x - this.state.minScreenX),
            y: alignToGrid(screen.y - this.state.minScreenY),
        };
    }
}