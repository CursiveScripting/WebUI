import * as React from 'react';
import { Step, UserProcess } from '../data';
import { StepDisplay } from './StepDisplay';
import './ProcessContent.css';

interface ProcessContentProps {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    process: UserProcess;
}

interface ProcessContentState {
    width: number;
    height: number;
}

export class ProcessContent extends React.PureComponent<ProcessContentProps, ProcessContentState> {
    private root: HTMLDivElement;
    private ctx: CanvasRenderingContext2D | null;
    private resizeListener?: () => void;
    private draggingStep?: Step;
    private dragX: number = 0;
    private dragY: number = 0;

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
                id={this.props.id}
                className={classes}
                style={this.props.style}
                ref={r => { if (r !== null) { this.root = r; }}}
                onMouseMove={e => this.stepDragMove(e)}
                onMouseUp={e => this.stepDragStop()}
            >
                <canvas
                    className="processContent__canvas"
                    ref={c => this.ctx = c === null ? null : c.getContext('2d')}
                    width={this.state.width}
                    height={this.state.height}
                />
                {this.renderSteps()}
            </div>
        );
    }

    componentDidMount() {
        this.resizeListener = () => this.updateSize();
        window.addEventListener('resize', this.resizeListener);
    
        this.updateSize();
    }
    
    componentWillUnmount() {
        if (this.resizeListener !== undefined) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }

    private renderSteps() {
        return this.props.process.steps.map((step, idx) => (
            <StepDisplay
                step={step}
                key={idx}
                readonly={false}
                headerMouseDown={(x, y) => this.stepDragStart(step, x, y)}
            />
        ));
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

    private stepDragStop() {
        this.draggingStep = undefined;
        this.dragX = 0;
        this.dragY = 0;
    }

    private stepDragMove(e: React.MouseEvent<HTMLDivElement>) {
        if (this.draggingStep === undefined) {
            return;
        }

        let dx = e.clientX - this.dragX;
        let dy = e.clientY - this.dragY;
        
        this.dragX = e.clientX;
        this.dragY = e.clientY;

        // const snapSize = 16;
        // this.draggingStep.x = Math.round((this.draggingStep.x + dx) / snapSize) * snapSize;
        // this.draggingStep.y = Math.round((this.draggingStep.y + dy) / snapSize) * snapSize;
        this.draggingStep.x += dx;
        this.draggingStep.y += dy;

        // TODO: only update the step that was dragged!
        this.forceUpdate();
    }
}