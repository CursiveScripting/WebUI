import * as React from 'react';
import './ReturnPathEditor.css';
import { ValueInput } from '../ProcessContent/ValueInput';
import { SortableListItem } from './SortableListItem';

interface Props {
    path: string;
    isValid: boolean;
    renamePath: (name: string) => void;
    removePath: () => void;
    moveUp?: () => void;
    moveDown?: () => void;
}

export const ReturnPathEditor: React.FunctionComponent<Props> = props => {
    
    return <SortableListItem
        className="returnPathEditor"
        isValid={props.isValid}
        moveUp={props.moveUp}
        moveDown={props.moveDown}
        remove={props.removePath}
    >
        <ValueInput
            className="returnPathEditor__path"
            value={props.path}
            valueChanged={props.renamePath}
            isValid={props.isValid}
        />
    </SortableListItem>
}