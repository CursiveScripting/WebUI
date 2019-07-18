import * as React from 'react';

interface Props {
    rootClassName?: string;
    backgroundClassName?: string;
    scrollRootClassName?: string;
    width: number;
    height: number;
    onScroll: (x: number, y: number) => void;
}

export const ScrollWrapper: React.FunctionComponent<Props> = props => {
    const contentSizeStyle = {
        width: props.width + 'px',
        height: props.height + 'px'
    };

    return (
        <div
            className={props.rootClassName}
            onScroll={e => props.onScroll((e.target as HTMLDivElement).scrollLeft, (e.target as HTMLDivElement).scrollTop)}
        >
            <div className={props.backgroundClassName} style={contentSizeStyle} />
            <div className={props.scrollRootClassName} style={contentSizeStyle}>
                {props.children}
            </div>
        </div>
    )
}