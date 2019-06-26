import * as React from 'react';
import './SortableList.css';
import { SortableListItem } from './SortableListItem';

interface Props {
    className?: string;
    prompt: string;
    addText: string;
    items: any[];
    renderItem: (index: number, item: any) => JSX.Element;
    itemValidity: boolean[];
    itemsChanged: (items: any[]) => void;
    createNewItems: () => any[];
}

export const SortableList: React.FunctionComponent<Props> = props => {
    const allItemsValid = props.itemValidity.reduce((prev, current) => current, true);

    let classes = 'sortableList';

    if (!allItemsValid) {
        classes += ' sortableList--invalid';
    }

    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const removeItem = (index: number) => {
        const newItems = props.items.slice();
        newItems.splice(index, 1);
        props.itemsChanged(newItems);
    };

    const items = props.items.map((item: any, index: number) => {
        const moveUp = index === 0
            ? undefined
            : () => {
                const newItems = props.items.slice();
                newItems.splice(index, 1);
                newItems.splice(index - 1, 0, item);
                props.itemsChanged(newItems);
            };

        const moveDown = index === props.items.length - 1
            ? undefined
            : () => {
                const newItems = props.items.slice();
                newItems.splice(index, 1);
                newItems.splice(index + 1, 0, item);
                props.itemsChanged(newItems);
            };
            
        return <SortableListItem
            key={index}
            isValid={props.itemValidity[index]}
            remove={() => removeItem(index)}
            moveUp={moveUp}
            moveDown={moveDown}
        >
            {props.renderItem(index, item)}
        </SortableListItem>
    });

    const addItems = () => props.itemsChanged([...props.items, ...props.createNewItems()]);

    return <div className={classes}>   
        <div className="sortableList__prompt">{props.prompt}</div>
        {items}
        <button className="sortableList__add" onClick={addItems}>
            {props.addText}
        </button>
    </div>
}