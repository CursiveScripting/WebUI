import * as React from 'react';
import { getScrollbarSize } from '../getScrollbarSize';

interface Props {
    className?: string;
    contentWidth: number;
    contentHeight: number;
    setScreenOffset: (x: number, y: number) => void;
    setDisplayExtent: (canvasWidth: number, canvasHeight: number) => void;
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
    onMouseUp: (e: React.MouseEvent<HTMLDivElement>) => void;
}

interface State {
    scrollbarWidth: number;
    scrollbarHeight: number;
}

export class ContentWrapper extends React.PureComponent<Props, State> {
    private root: HTMLDivElement = undefined as unknown as HTMLDivElement;
    private resizeListener?: () => void;

    constructor(props: Props) {
        super(props);

        const scrollSize = getScrollbarSize();

        this.state = {
            scrollbarWidth: scrollSize.width,
            scrollbarHeight: scrollSize.height,
        };
    }

    componentDidMount() {
        const root = this.root.getBoundingClientRect();
        this.props.setScreenOffset(root.left, root.top);

        this.resizeListener = () => this.updateViewSize();
        window.addEventListener('resize', this.resizeListener);
        
        this.updateViewSize();
    }
    
    componentWillUnmount() {
        if (this.resizeListener !== undefined) {
            window.removeEventListener('resize', this.resizeListener);
        }
    }
    
    private updateViewSize() {
        const canvasWidth = this.root.offsetWidth - this.state.scrollbarWidth;
        const canvasHeight = this.root.offsetHeight - this.state.scrollbarHeight;

        this.props.setDisplayExtent(canvasWidth, canvasHeight);
    }
    
    render() {
        return (
            <div
                className={this.props.className}
                ref={r => { if (r !== null) { this.root = r; }}}
                onMouseMove={this.props.onMouseMove}
                onMouseUp={this.props.onMouseUp}
            >
                {this.props.children}
            </div>
        )
    }
}