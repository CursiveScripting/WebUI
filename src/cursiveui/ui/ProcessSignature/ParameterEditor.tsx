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
    removeParameter: () => void;
}

export const ParameterEditor: React.FunctionComponent<Props> = props => {
    let classes = 'parameterEditor';
    if (!props.isValid) {
        classes += ' parameterEditor--invalid'
    }

    const types = props.allTypes.map((type, index) => <option key={index} value={index}>{type.name}</option>)

    return <div className={classes}>
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
            {types}
        </select>

        <button onClick={props.removeParameter}>remove</button>
    </div>
}