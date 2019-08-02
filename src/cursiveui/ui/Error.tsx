import * as React from 'react';
import './Error.css';

interface Props {
    message: string;
}

export const Error = (props: Props) => {
    return (
        <div className="error">
            <h1>Error</h1>
            <p>{props.message}</p>
        </div>
    )
}