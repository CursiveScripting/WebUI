import * as React from 'react';
import './ParametersEditor.css';
import { ParamInfo } from './SignatureEditor';
import { Type } from '../../data';
import { ParameterEditor } from './ParameterEditor';
import { SortableList } from './SortableList';

interface Props {
    className?: string;
    input: boolean;
    parameters: ParamInfo[];
    parameterValidity: boolean[];
    parametersChanged: (parameters: ParamInfo[]) => void;
    dataTypes: Type[];
}

export const ParametersEditor: React.FunctionComponent<Props> = props => {
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

    const editParam = (index: number, newName: string, newType: Type) => {
        const newParams = props.parameters.slice();
        const prevParam = newParams[index];

        newParams[index] = {
            name: newName,
            type: newType,
            underlyingParameter: prevParam.underlyingParameter,
        };
        props.parametersChanged(newParams);
    };

    const createNewItems = () => [{ name: '', type: props.dataTypes[0] }]

    const renderItem = (index: number) => {
        const param = props.parameters[index];

        return <ParameterEditor
            name={param.name}
            type={param.type}
            allTypes={props.dataTypes}
            isValid={props.parameterValidity[index]}
            renameParameter={name => editParam(index, name, param.type)}
            changeType={type => editParam(index, param.name, type)}
        />
    }

    return <SortableList
        className="parametersEditor"
        prompt={prompt}
        addText={props.input ? 'Add input' : 'Add output'}
        createNewItems={createNewItems}
        items={props.parameters}
        itemValidity={props.parameterValidity}
        itemsChanged={props.parametersChanged}
        renderItem={renderItem}
    />
}