import * as React from 'react';
import './ParameterEditor.css';
import { ValueInput } from '../ProcessContent/ValueInput';
import { Type } from '../../data';
import { SortableListItem } from './SortableListItem';

interface Props {
    name: string;
    type: Type;
    isValid: boolean;
    allTypes: Type[];
    renameParameter: (name: string) => void;
    changeType: (type: Type) => void;
    removeParameter: () => void;
    moveUp?: () => void;
    moveDown?: () => void;
}

export const ParameterEditor: React.FunctionComponent<Props> = props => {
    const typeOptions = props.allTypes.map((type, index) => <option key={index} value={index}>{type.name}</option>)

    return <SortableListItem className="parameterEditor"
        isValid={props.isValid}
        moveUp={props.moveUp}
        moveDown={props.moveDown}
        remove={props.removeParameter}
    >
        <ValueInput
            className="parameterEditor__name"
            value={props.name}
            valueChanged={props.renameParameter}
            isValid={props.isValid}
        />
        
        <select
            className="parameterEditor__type"
            value={props.allTypes.indexOf(props.type)}
            onChange={e => props.changeType(props.allTypes[e.target.selectedIndex])}
        >
            {typeOptions}
        </select>
    </SortableListItem>
}