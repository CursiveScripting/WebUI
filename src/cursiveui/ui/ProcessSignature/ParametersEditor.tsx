import * as React from 'react';
import './ParametersEditor.css';
import { ParamInfo } from './SignatureEditor';
import { Type } from '../../data';
import { ParameterEditor } from './ParameterEditor';

interface Props {
    className?: string;
    input: boolean;
    parameters: ParamInfo[];
    parameterValidity: boolean[];
    parametersChanged: (parameters: ParamInfo[]) => void;
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

    let prompt: string;
    if (props.input) {
        prompt = props.parameters.length === 0
            ? 'No inputs'
            : 'Inputs:';
    }
    else {
        prompt = props.parameters.length === 0
            ? 'No outputs'
            : 'Outputs:';
    }

    const changeParam = (index: number, newName: string, newType: Type) => {
        const newParams = props.parameters.slice();
        const prevParam = newParams[index];

        newParams[index] = {
            name: newName,
            type: newType,
            underlyingParameter: prevParam.underlyingParameter,
        };
        props.parametersChanged(newParams);
    };

    const removeParam = (index: number) => {
        const newParams = props.parameters.slice();
        newParams.splice(index, 1);
        props.parametersChanged(newParams);
    };

    const parameters = props.parameters.map((param: ParamInfo, index: number) => {
        const moveUp = index === 0
            ? undefined
            : () => {
                const newParams = props.parameters.slice();
                newParams.splice(index, 1);
                newParams.splice(index - 1, 0, param);
                props.parametersChanged(newParams);
            };

        const moveDown = index === props.parameters.length - 1
            ? undefined
            : () => {
                const newParams = props.parameters.slice();
                newParams.splice(index, 1);
                newParams.splice(index + 1, 0, param);
                props.parametersChanged(newParams);
            };
            
        return (
            <ParameterEditor
                key={index}
                name={param.name}
                type={param.type}
                isValid={props.parameterValidity[index]}
                renameParameter={name => changeParam(index, name, param.type)}
                changeType={type => changeParam(index, param.name, type)}
                removeParameter={() => removeParam(index)}
                moveUp={moveUp}
                moveDown={moveDown}
                allTypes={props.dataTypes}
            />
        )
    });

    const addParameter = () => props.parametersChanged([...props.parameters, { name: '', type: props.dataTypes[0] }]);

    return <div className={classes}>   
        <div className="parametersEditor__prompt">{prompt}</div>
        {parameters}
        <button className="parametersEditor__add" onClick={addParameter}>
            Add {props.input ? 'input' : 'output'}
        </button>
    </div>
}