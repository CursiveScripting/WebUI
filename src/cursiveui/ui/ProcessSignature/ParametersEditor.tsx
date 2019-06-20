import * as React from 'react';
import './ParametersEditor.css';
import { ReturnPathEditor } from './ReturnPathEditor';
import { Parameter } from './SignatureDisplay';
import { Type } from '../../data';
import { ParameterEditor } from './ParameterEditor';

interface Props {
    className?: string;
    input: boolean;
    parameters: Parameter[];
    parameterValidity: boolean[];
    parametersChanged: (parameters: Parameter[]) => void;
    dataTypes: Type[];
}

export const ParametersEditor: React.FunctionComponent<Props> = props => {
    let classes = 'parametersEditor';
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const allParametersValid = props.parameterValidity.reduce((prev, current) => current, true);

    if (!allParametersValid) {
        classes += ' parametersEditor--invalid';
    }

    const changeParam = (index: number, newName: string, newType: Type) => {
        const newParams = props.parameters.slice();
        newParams[index] = {
            name: newName,
            type: newType,
        };
        props.parametersChanged(newParams);
    };

    const removeParam = (index: number) => {
        const newParams = props.parameters.slice().splice(index, 1);
        props.parametersChanged(newParams);
    };

    const parameters = props.parameters.map((param: Parameter, index: number) => (
        <ParameterEditor
            key={index}
            name={param.name}
            type={param.type}
            isValid={props.parameterValidity[index]}
            renameParameter={name => changeParam(index, name, param.type)}
            changeType={type => changeParam(index, param.name, type)}
            removeParameter={() => removeParam(index)}
            
            allTypes={props.dataTypes}
        />
    ));

    const addParameter = () => props.parametersChanged([...props.parameters, { name: '', type: props.dataTypes[0] }]);

    return <div className={classes}>
        {parameters}
        <button className="returnPathEditor__add" onClick={addParameter}>
            Add parameter
        </button>
    </div>
}