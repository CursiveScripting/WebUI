import * as React from 'react';
import './SignatureEditor.css';
import { ValueInput } from '../ProcessContent/ValueInput';
import { ReturnPathsEditor } from './ReturnPathsEditor';
import { ParametersEditor } from './ParametersEditor';
import { IParameter } from '../../workspaceState/IParameter';
import { IType } from '../../workspaceState/IType';

export interface IParamInfo {
    name: string;
    type: IType;
    underlyingParameter?: IParameter;
}

interface Props {
    name: string;
    nameValid: boolean;
    nameChanged: (name: string) => void;

    description: string;
    descriptionChanged: (description: string) => void;

    returnPaths: string[];
    returnPathsValid: boolean[];
    returnPathsChanged: (paths: string[]) => void;

    inputs: IParamInfo[];
    inputsValid: boolean[];
    inputsChanged: (inputs: IParamInfo[]) => void;

    outputs: IParamInfo[];
    outputsValid: boolean[];
    outputsChanged: (outputs: IParamInfo[]) => void;

    dataTypes: IType[];
}

export const SignatureEditor = (props: Props) => {
    let classes = 'signatureEditor';

    const parametersSection = props.dataTypes.length === 0
        ? undefined
        :  <div className="signatureEditor__body">
            <ParametersEditor
                input={true}
                parameters={props.inputs}
                parameterValidity={props.inputsValid}
                parametersChanged={props.inputsChanged}
                dataTypes={props.dataTypes}
            />
            <div className="signatureEditor__spacer" />
            <ParametersEditor
                input={false}
                parameters={props.outputs}
                parameterValidity={props.outputsValid}
                parametersChanged={props.outputsChanged}
                dataTypes={props.dataTypes}
            />
        </div>

    // TODO: if we stick with ValueInput here, take it out of ProcessContent folder

    return <div className={classes}>
        <ValueInput
            className="signatureEditor__name"
            value={props.name}
            valueChanged={props.nameChanged}
            isValid={props.nameValid}
        />
        <div className="signatureEditor__body">
            <ValueInput
                className="signatureEditor__description"
                value={props.description}
                valueChanged={props.descriptionChanged}
                isValid={true}
            />
            <ReturnPathsEditor
                pathNames={props.returnPaths}
                pathValidity={props.returnPathsValid}
                pathsChanged={props.returnPathsChanged}
            />
        </div>
        {parametersSection}
    </div>
}