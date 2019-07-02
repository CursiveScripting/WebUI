import * as React from 'react';

interface Props {
    rootClassName?: string;
    backgroundClassName?: string;
    scrollRootClassName?: string;
    width: number;
    height: number;
    onScroll: () => void;
}

export const ScrollWrapper: React.FunctionComponent<Props> = props => {
    const contentSizeStyle = {
        width: props.width + 'px',
        height: props.height + 'px'
    };

    return (
        <div
            className={props.rootClassName}
            onScroll={() => props.onScroll()}
        >
            <div className={props.backgroundClassName} style={contentSizeStyle} />
            <div className={props.scrollRootClassName} style={contentSizeStyle}>
                {props.children}
            </div>
        </div>
    )
}