import * as React from 'react';
import { Type } from '../../data';
import './SignatureDisplay.css';
import { ValueInput } from '../ProcessContent/ValueInput';
import { ReturnPathsEditor } from './ReturnPathsEditor';
import { ParametersEditor } from './ParametersEditor';

export interface Parameter {
    name: string;
    type: Type;
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

    inputs: Parameter[];
    inputsValid: boolean[];
    inputsChanged: (inputs: Parameter[]) => void;

    outputs: Parameter[];
    outputsValid: boolean[];
    outputsChanged: (outputs: Parameter[]) => void;

    dataTypes: Type[];
}

export const SignatureDisplay: React.FunctionComponent<Props> = props => {
    let classes = 'signatureDisplay';

    const parametersSection = props.dataTypes.length === 0
        ? undefined
        :  <div className="signatureDisplay__bodySection">
            <ParametersEditor
                input={true}
                parameters={props.inputs}
                parameterValidity={props.inputsValid}
                parametersChanged={props.inputsChanged}
                dataTypes={props.dataTypes}
            />
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
            className="signatureDisplay__name"
            value={props.name}
            valueChanged={props.nameChanged}
            isValid={props.nameValid}
        />
        <div className="signatureDisplay__body">
            <ValueInput
                className="signatureDisplay__description"
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