import React, { FunctionComponent, useState } from 'react';
import './ProcessFolder.css';

interface Props {
    name: string;
}

export const ProcessFolder: FunctionComponent<Props> = ({ name, children }) => {
    const [open, setOpen] = useState(true);

    const classes = open
        ? 'processFolder processFolder--open'
        : 'processFolder processFolder--closed';
    
    const clickHeader = () => setOpen(!open);

    return (
        <div className={classes}>
            <div className="processFolder__header" onClick={clickHeader}>
                <div className="processFolder__headerText">{name}</div>
            </div>
            <div className="processFolder__content">
                {children}
            </div>
        </div>
    );
}