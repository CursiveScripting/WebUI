import * as React from 'react';
import { alignToGrid, growToFitGrid, gridSize } from './gridSize';
import { StepDisplay } from './StepDisplay';
import { VariableDisplay } from './VariableDisplay';
import './ProcessContent.css';
import { LinkCanvas } from './LinkCanvas';
import { ScrollWrapper } from './ScrollWrapper';
import { ContentItems } from './ContentItems';
import { ContentWrapper } from './ContentWrapper';
import { WorkspaceDispatchContext } from '../../reducer';
import { determineVariableName } from '../../services/StepFunctions';
import { DropInfo } from '../WorkspaceEditor';
import { IStep } from '../../state/IStep';
import { IVariable } from '../../state/IVariable';
import { IStepParameter } from '../../state/IStepParameter';
import { IValidationError } from '../../state/IValidationError';

interface Props {
    processName: string;
    steps: IStep[];
    variables: IVariable[];
    errors: IValidationError[];

    className?: string;
    
    dropping?: DropInfo;
    dropComplete: () => void;

    focusError?: IValidationError;
}

interface State {
    contentWidth: number;
    contentHeight: number;
    canvasWidth: number;
    canvasHeight: number;
    dragging?: DragInfo;
    minScreenX: number;
    minScreenY: number;
    scrollX: number;
    scrollY: number;
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
    step: IStep;
    x: number;
    y: number;
    xOffset: number;
    yOffset: number;
} | {
    type: DragType.Variable;
    variable: IVariable;
    x: number;
    y: number;
    xOffset: number;
    yOffset: number;
} | {
    type: DragType.StepInConnector;
    x: number;
    y: number;
    step: IStep;
} | {
    type: DragType.ReturnPath;
    x: number;
    y: number;
    step: IStep;
    returnPath: string | null;
} | {
    type: DragType.StepParameter;
    x: number;
    y: number;
    step: IStep;
    input: boolean;
    param: IStepParameter;
} | {
    type: DragType.VarParameter;
    x: number;
    y: number;
    variable: IVariable;
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
            canvasWidth: 0,
            canvasHeight: 0,
            contentWidth: 0,
            contentHeight: 0,
            minScreenX: 0,
            minScreenY: 0,
            scrollX: 0,
            scrollY: 0,
        };
    }

    componentDidMount() {
        this.updateContentSize();
    }

    componentDidUpdate() {
        this.canvas!.drawLinks(); // Call this here as if the canvas chooses not to render, shouldComponentUpdate is too early for the display references to have been updated.
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
                    steps={this.props.steps}
                    variables={this.props.variables}
                    stepDisplays={this.stepDisplays}
                    variableDisplays={this.variableDisplays}
                    dragging={this.state.dragging}
                    scrollX={this.state.scrollX}
                    scrollY={this.state.scrollY}
                    ref={c => this.canvas = c}
                />

                <ScrollWrapper
                    rootClassName="processContent__scrollWrapper"
                    scrollRootClassName="processContent__scrollRoot"
                    width={Math.max(this.state.contentWidth, this.state.canvasWidth)}
                    height={Math.max(this.state.contentHeight, this.state.canvasHeight)}
                    onScroll={(x, y) => this.setState({ scrollX: x, scrollY: y })}
                >
                    <ContentItems
                        processName={this.props.processName}
                        steps={this.props.steps}
                        variables={this.props.variables}
                        errors={this.props.errors}
                        varRefs={this.variableDisplays}
                        stepRefs={this.stepDisplays}
                        minScreenX={this.state.minScreenX}
                        minScreenY={this.state.minScreenY}

                        dragging={this.state.dragging}
                        setDragging={drag => this.setState({ dragging: drag === undefined
                            ? undefined
                            : {
                                ...drag, // Without this we get a single frame using the wrong position
                                x: drag.x + this.state.scrollX,
                                y: drag.y + this.state.scrollY,
                            }
                        })}

                        focusError={this.props.focusError}
                    />
                </ScrollWrapper>
            </ContentWrapper>
        );
    }

    componentWillReceiveProps(nextProps: Props) {
        if (nextProps.processName !== this.props.processName
            || nextProps.steps.length !== this.props.steps.length
            || nextProps.variables.length !== this.props.variables.length) {
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
                    inProcessName: this.props.processName,
                    stepId: dragging.step.uniqueId,
                    x: alignToGrid(dragging.x),
                    y: alignToGrid(dragging.y),
                });
                break;
            }
            case DragType.Variable: {
                this.context({
                    type: 'move variable',
                    inProcessName: this.props.processName,
                    varName: dragging.variable.name,
                    x: alignToGrid(dragging.x),
                    y: alignToGrid(dragging.y),
                });
                break;
            }
            case DragType.StepParameter: {
                this.context({
                    type: 'link new variable',
                    inProcessName: this.props.processName,
                    typeName: dragging.param.type.name,
                    varName: determineVariableName(dragging.param.type.name, this.props.variables),
                    x: alignToGrid(dragging.x),
                    y: alignToGrid(dragging.y),
                    stepId: dragging.step.uniqueId,
                    stepInputParam: dragging.input,
                    stepParamName: dragging.param.name,
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
                        inProcessName: this.props.processName,
                        stepProcessName: this.props.dropping.processName,
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropping.type === 'variable') {
                    this.context({
                        type: 'add variable',
                        inProcessName: this.props.processName,
                        typeName: this.props.dropping.typeName,
                        varName: determineVariableName(this.props.dropping.typeName, this.props.variables),
                        x: gridDropPos.x,
                        y: gridDropPos.y,
                    });

                    this.props.dropComplete();
                }
                else if (this.props.dropping.type === 'stop') {
                    this.context({
                        type: 'add stop step',
                        inProcessName: this.props.processName,
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
        else { // I'm not 100% clear why we don't ALWAYS add these, but this works.
            x += this.state.scrollX;
            y += this.state.scrollY;
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