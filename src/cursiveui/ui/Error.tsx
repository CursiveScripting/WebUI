import * as React from 'react';
import './Error.css';

interface Props {
    message: string;
    stack?: string;
}

export const Error = (props: Props) => {
    const stack = props.stack === undefined
        ? undefined
        : <p className="error__stack">{props.stack}</p>

    return (
        <div className="error">
            <h1 className="error__header">Error</h1>
            <p className="error__message">{props.message}</p>
            {stack}
        </div>
    )
}