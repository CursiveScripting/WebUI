import * as React from 'react';
import { alignToGrid, growToFitGrid, gridSize } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import './ProcessContent.css';
import { LinkCanvas } from './LinkCanvas';
import { ScrollWrapper } from './ScrollWrapper';
import { ContentItems } from './ContentItems';
import { ContentWrapper } from './ContentWrapper';
import { WorkspaceDispatchContext } from '../../workspaceState/actions';
import { IProcess } from '../../workspaceState/IProcess';
import { IType } from '../../workspaceState/IType';
import { determineVariableName } from '../../services/StepFunctions';
import { IStepDisplay, IStepDisplayParam, populateStepDisplay } from './IStepDisplay';
import { IVariableDisplay, populateVariableDisplay } from './IVariableDisplay';
import { IUserProcess } from '../../workspaceState/IUserProcess';
import { DropInfo } from '../WorkspaceEditor';

interface Props {
    openProcess: IUserProcess;
    typesByName: Map<string, IType>;
    processesByName: Map<string, IProcess>;

    className?: string;
    
    dropping?: DropInfo;
    dropComplete: () => void;

    focusStepId?: string;
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

export enum DragType {
    Step,
    Variable,
    StepInConnector,
    ReturnPath,
    StepParameter,
    VarParameter,
    DropNew,
}

export type DragInfo = {
    type: DragType.Step;
    step: IStepDisplay;
    x: number;
    y: number;
    xOffset: number;
    yOffset: number;
} | {
    type: DragType.Variable;
    variable: IVariableDisplay;
    x: number;
    y: number;
    xOffset: number;
    yOffset: number;
} | {
    type: DragType.StepInConnector;
    x: number;
    y: number;
    step: IStepDisplay;
} | {
    type: DragType.ReturnPath;
    x: number;
    y: number;
    step: IStepDisplay;
    returnPath: string | null;
} | {
    type: DragType.StepParameter;
    x: number;
    y: number;
    step: IStepDisplay;
    input: boolean;
    param: IStepDisplayParam;
} | {
    type: DragType.VarParameter;
    x: number;
    y: number;
    variable: IVariableDisplay;
    input: boolean;
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

        return (
            <ContentWrapper
                className={classes}
                contentWidth={this.state.contentWidth}
                contentHeight={this.state.contentHeight}
                setScreenOffset={(x, y) => this.setState({ minScreenX: x, minScreenY: y })}
                setDisplayExtent={(w, h) => this.setState({ canvasWidth: w, canvasHeight: h })}
                onMouseMove={e => this.mouseMove(e)}
                onMouseUp={e => this.stopDraggingOnNothing()}
            >
                <LinkCanvas
                    className="processContent__canvas"
                    width={this.state.canvasWidth}
                    height={this.state.canvasHeight}
                    steps={this.state.steps}
                    variables={this.state.variables}
                    stepDisplays={this.stepDisplays}
                    variableDisplays={this.variableDisplays}
                    dragging={this.state.dragging}
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
                        minScreenX={this.state.minScreenX}
                        minScreenY={this.state.minScreenY}

                        dragging={this.state.dragging}
                        setDragging={dragging => this.setState({dragging})}

                        focusStepId={this.props.focusStepId}
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

        if (nextProps.dropping !== undefined && this.props.dropping !== nextProps.dropping) {
            this.setState({
                dragging: {
                    type: DragType.DropNew,
                    x: 0,
                    y: 0,
                }
            });
        }
    }
    
    private stopDraggingOnNothing() {
        const dragging = this.state.dragging;
        if (dragging === undefined) {
            return;
        }

        this.setState({
            dragging: undefined,
        });

        switch (dragging.type) {
            case DragType.Step: {
                this.context({
                    type: 'move step',
                    inProcessName: this.props.openProcess.name,
                    stepId: dragging.step.uniqueId,
                    x: alignToGrid(dragging.x),
                    y: alignToGrid(dragging.y),
                });
                break;
            }
            case DragType.Variable: {
                this.context({
                    type: 'move variable',
                    inProcessName: this.props.openProcess.name,
                    varName: dragging.variable.name,
                    x: alignToGrid(dragging.x),
                    y: alignToGrid(dragging.y),
                });
                break;
            }
            case DragType.StepParameter: {
                const gridDropPos = {
                    x: alignToGrid(dragging.x),
                    y: alignToGrid(dragging.y),
                };

                const newVarName = determineVariableName(dragging.param.type.name, this.state.variables)
                
                // TODO: combine these into a single action, to allow undoing in a single step?
                this.context({
                    type: 'add variable',
                    inProcessName: this.props.openProcess.name,
                    typeName: dragging.param.type.name,
                    varName: newVarName,
                    x: gridDropPos.x,
                    y: gridDropPos.y,
                });
                
                this.context({
                    type: 'link variable',
                    inProcessName: this.props.openProcess.name,
                    stepId: dragging.step.uniqueId,
                    stepInputParam: dragging.input,
                    stepParamName: dragging.param.name,
                    varName: newVarName,
                });
                break;
            }
            case DragType.DropNew: {
                if (this.props.dropping === undefined) {
                    break;
                }

                const gridDropPos = {
                    x: alignToGrid(dragging.x),
                    y: alignToGrid(dragging.y),
                };

                if (this.props.dropping.type === 'step') {
                    this.context({
                        type: 'add step',
                        inProcessName: this.props.openProcess.name,
                        stepProcessName: this.props.dropping.processName,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropping.type === 'variable') {
                    this.context({
                        type: 'add variable',
                        inProcessName: this.props.openProcess.name,
                        typeName: this.props.dropping.typeName,
                        varName: determineVariableName(this.props.dropping.typeName, this.state.variables),
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropping.type === 'stop') {
                    this.context({
                        type: 'add stop step',
                        inProcessName: this.props.openProcess.name,
                        returnPath: this.props.dropping.returnPath,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                break;
            }
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

        let x = e.clientX - this.state.minScreenX;
        let y = e.clientY - this.state.minScreenY;

        if (dragging.type === DragType.Step || dragging.type === DragType.Variable) {
            x -= dragging.xOffset;
            y -= dragging.yOffset;
        }

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
}