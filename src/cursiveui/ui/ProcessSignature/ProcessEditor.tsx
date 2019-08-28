import * as React from 'react';
import './ProcessEditor.css';
import { IParamInfo, SignatureEditor } from './SignatureEditor';
import { IProcess } from '../../state/IProcess';
import { IUserProcess } from '../../state/IUserProcess';
import { WorkspaceDispatchContext, WorkspaceAction } from '../../reducer';
import { useMemo, useState, useContext } from 'react';
import { isProcessUsedAnywhere } from '../../services/ProcessFunctions';
import { IType } from '../../state/IType';
import { INamed } from '../../state/INamed';
import { IParameter } from '../../state/IParameter';

interface IProps {
    process?: IUserProcess;
    className?: string;
    allProcesses: IProcess[];
    allTypes: IType[];
    close: () => void;
}

interface IValidity<T> {
    value: string;
    valid: boolean;
}

interface IValiditySet<T> {
    values: T[];
    validity: boolean[]
}

export const ProcessEditor: React.FunctionComponent<IProps> = props => {
    const context = useContext(WorkspaceDispatchContext);
    
    const [name, setName] = useState(
        props.process === undefined
            ? {
                value: '',
                valid: false,
            }
            : {
                value: props.process.name,
                valid: isProcessNameValid(props.process.name, props.process, props.allProcesses),
            }
    );

    const [desc, setDesc] = useState(
        props.process === undefined
            ? ''
            : props.process.description
    );

    const [returnPaths, setReturnPaths] = useState(
        props.process === undefined
            ? {
                values: [],
                validity: [],
            }
            : {
                values: props.process.returnPaths.slice(),
                validity: props.process.returnPaths.map((path, index) => isReturnPathNameValid(index, props.process!.returnPaths)),
            }
    );
    
    const [inputs, setInputs] = useState(
        props.process === undefined
            ? {
                values: [],
                validity: [],
            }
            : {
                values: props.process.inputs.map(i => { return { type: i.type, name: i.name }; }),
                validity: props.process.inputs.map((param, index) => isParameterNameValid(index, props.process!.inputs)),
            }
    );

    const [outputs, setOutputs] = useState(
        props.process === undefined
            ? {
                values: [],
                validity: [],
            }
            : {
                values: props.process.outputs.map(o => { return { type: o.type, name: o.name }; }),
                validity: props.process.outputs.map((param, index) => isParameterNameValid(index, props.process!.outputs)),
            }
    );

    let classes = 'processEditor';
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const nameChanged = (name: string) => setName({
        value: name,
        valid: isProcessNameValid(name, props.process, props.allProcesses),
    });

    const descChanged = (description: string) => setDesc(description);

    const returnPathsChanged = (returnPaths: string[]) => setReturnPaths({
        values: returnPaths,
        validity: returnPaths.map((path, index) => isReturnPathNameValid(index, returnPaths)),
    });

    const inputsChanged = (params: IParamInfo[]) => setInputs({
        values: params,
        validity: params.map((param, index) => isParameterNameValid(index, params)),
    });

    const outputsChanged = (params: IParamInfo[]) => setOutputs({
        values: params,
        validity: params.map((param, index) => isParameterNameValid(index, params)),
    });

    const errors = useMemo(
        () => getErrors(name, returnPaths, inputs, outputs),
        [ name, returnPaths, inputs, outputs ]
    );

    const canSave = errors.length === 0;
    const validationSummary = canSave
        ? undefined
        : <ul className="processEditor__errors">
            {errors.map((msg, index) => <li className="processEditor__error" key={index}>{msg}</li>)}
        </ul>

    const save = !canSave
        ? undefined
        : () => {
            saveChanges(props.process, name.value, desc, returnPaths.values, inputs.values, outputs.values, context);
            props.close();
        };
    const cancel = () => props.close();

    // eslint-disable-next-line
    const canDelete = useMemo(() => props.process !== undefined && !isProcessUsedAnywhere(props.process, props.allProcesses), [props.process, props.allProcesses]);
    
    const deleteProcess = canDelete
        ? () => {
            context({
                type: 'remove process',
                name: props.process!.name,
            });

            props.close();
        }
        : undefined

    const deleteButton = props.process === undefined
        ? undefined
        : canDelete
            ? <input type="button" className="processEditor__button" value="Delete process" onClick={deleteProcess} />
            : <input type="button" className="processEditor__button" value="Cannot delete" title="This process is used in other processes" disabled={true} />

    return (
        <div className={classes}>
            <SignatureEditor
                dataTypes={props.allTypes}

                name={name.value}
                nameValid={name.valid}
                nameChanged={nameChanged}

                description={desc}
                descriptionChanged={descChanged}

                returnPaths={returnPaths.values}
                returnPathsValid={returnPaths.validity}
                returnPathsChanged={returnPathsChanged}

                inputs={inputs.values}
                inputsValid={inputs.validity}
                inputsChanged={inputsChanged}

                outputs={outputs.values}
                outputsValid={outputs.validity}
                outputsChanged={outputsChanged}
            />

            {validationSummary}
            
            <div className="processEditor__footer">
                <input type="button" className="processEditor__button processEditor__button--save" value="Save changes" onClick={save} disabled={!canSave} />
                <input type="button" className="processEditor__button" value="Cancel" onClick={cancel} />
                {deleteButton}
            </div>
        </div>
    );
}

function getErrors(name: IValidity<string>, returnPaths: IValiditySet<string>, inputs: IValiditySet<IParameter>, outputs: IValiditySet<IParameter>) {
    const errors = [];

    if (!name.valid) {
        errors.push(
            name.value.trim() === ''
                ? 'Give this process a name.'
                : 'This name is already in use, give this process a different name.'
        );
    }
    
    if (!returnPaths.validity.reduce((prev, curr) => prev && curr, true)) {
        errors.push(
            returnPaths.values.length === 1
                ? 'Cannot have only one named return path. Either add more or remove this named path.'
                : 'Ensure that all return paths have unique names.'
        );
    }

    if (!inputs.validity.reduce((prev, curr) => prev && curr, true)) {
        errors.push('Ensure that all inputs have unique names.');
    }

    if (!outputs.validity.reduce((prev, curr) => prev && curr, true)) {
        errors.push('Ensure that all outputs have unique names.');
    }
    
    return errors;
}

function saveChanges(process: IUserProcess | undefined, name: string, description: string, returnPaths: string[], inputs: IParameter[], outputs: IParameter[], context: React.Dispatch<WorkspaceAction>) {
    if (process === undefined) {
        context({
            type: 'add process',
            name,
            description,
            inputs: inputs.map(i => { return {
                name: i.name,
                type: i.type,
            }}),
            outputs: outputs.map(o => { return {
                name: o.name,
                type: o.type,
            }}),
            returnPaths: returnPaths,
            folder: null, // TODO handle this
        });
    }
    else {
        const inputOrderMap = process === undefined
            ? inputs.map(i => undefined)
            : inputs.map(i => process!.inputs.findIndex(orig => orig === i.underlyingParameter));

        const outputOrderMap = process === undefined
            ? outputs.map(i => undefined)
            : outputs.map(o => process!.outputs.findIndex(orig => orig === o.underlyingParameter));

        context({
            type: 'edit process',
            oldName: process.name,
            newName: name,
            description: description,
            folder: null, // TODO: handle this
            inputs: inputs.map(i => { return {
                name: i.name,
                type: i.type,
            }}),
            outputs: outputs.map(o => { return {
                name: o.name,
                type: o.type,
            }}),
            inputOrderMap,
            outputOrderMap,
            returnPaths,
        });
    }
}

function isProcessNameValid(name: string, thisProcess: IUserProcess | undefined, allProcesses: IProcess[]) {
    // A process name with space on the end or that exactly matches another is invalid.
    return name !== ''
        && name === name.trim()
        && allProcesses.find(p => p.name === name) === thisProcess;
}

function isReturnPathNameValid(pathIndex: number, pathNames: string[]) {
    // A path name with space on the end or that exactly matches another is invalid.
    // A path name is also invalid if we only have one: we should have 0 or 2+.
    const pathName = pathNames[pathIndex];
    return pathName !== ''
        && pathName === pathName.trim()
        && pathNames.indexOf(pathName) === pathIndex
        && pathName.length !== 1;
}

function isParameterNameValid(paramIndex: number, parameters: INamed[]) {
    // A parameter name with space on the end or that exactly matches another is invalid.
    const paramName = parameters[paramIndex].name;
    return paramName !== ''
        && paramName === paramName.trim()
        && parameters.findIndex(p => p.name === paramName) === paramIndex;
}