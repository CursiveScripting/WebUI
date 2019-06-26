import * as React from 'react';
import './SortableListItem.css';

interface Props {
    className?: string;
    isValid: boolean;
    
    remove: () => void;
    moveUp?: () => void;
    moveDown?: () => void;
}

export const SortableListItem: React.FunctionComponent<Props> = props => {
    let classes = 'sortableListItem';
    if (!props.isValid) {
        classes += ' sortableListItem--invalid'
    }

    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const moveUp = props.moveUp === undefined
        ? <div className="sortableListItem__spacer" />
        : <button
            className="sortableListItem__iconButton sortableListItem__moveUp"
            onClick={props.moveUp}
        />

    const moveDown = props.moveDown === undefined
        ? <div className="sortableListItem__spacer" />
        : <button
            className="sortableListItem__iconButton sortableListItem__moveDown"
            onClick={props.moveDown}
        />

    const remove =<button
        onClick={props.remove}
        className="sortableListItem__iconButton sortableListItem__remove"
    />

    return <div className={classes}>
        {props.children}
        {moveUp}
        {moveDown}
        {remove}
    </div>
}