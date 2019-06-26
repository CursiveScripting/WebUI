import * as React from 'react';
import './ParameterEditor.css';
import { ValueInput } from '../ProcessContent/ValueInput';
import { Type } from '../../data';

interface Props {
    name: string;
    type: Type;
    isValid: boolean;
    allTypes: Type[];
    renameParameter: (name: string) => void;
    changeType: (type: Type) => void;
}

export const ParameterEditor: React.FunctionComponent<Props> = props => {
    const typeOptions = props.allTypes.map((type, index) => <option key={index} value={index}>{type.name}</option>)

    return <React.Fragment>
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
    </React.Fragment>
}