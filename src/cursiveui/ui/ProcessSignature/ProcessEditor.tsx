import * as React from 'react';
import './ProcessEditor.css';
import { IParamInfo, SignatureEditor } from './SignatureEditor';
import { IProcess } from '../../state/IProcess';
import { IUserProcess } from '../../state/IUserProcess';
import { WorkspaceDispatchContext } from '../../reducer';
import { useMemo } from 'react';
import { isProcessUsedAnywhere } from '../../services/ProcessFunctions';
import { IType } from '../../state/IType';
import { INamed } from '../../state/INamed';

interface Props {
    process?: IUserProcess;
    className?: string;
    allProcesses: IProcess[];
    allTypes: IType[];
    close: () => void;
}

interface State {
    name: string;
    nameValid: boolean;
    description: string;
    returnPaths: string[];
    returnPathValidity: boolean[];
    inputs: IParamInfo[];
    inputValidity: boolean[];
    outputs: IParamInfo[];
    outputValidity: boolean[];
    // TODO: folder
}

export class ProcessEditor extends React.PureComponent<Props, State> {
    static contextType = WorkspaceDispatchContext;
    context!: React.ContextType<typeof WorkspaceDispatchContext>;
    
    constructor(props: Props) {
        super(props);

        const getType = (name: string) => props.allTypes.find(t => t.name === name)!;

        this.state = props.process === undefined
            ? {
                name: '',
                nameValid: false,
                description: '',
                returnPaths: [],
                returnPathValidity: [],
                inputs: [],
                inputValidity: [],
                outputs: [],
                outputValidity: [],
            }
            : {
                name: props.process.name,
                nameValid: this.isProcessNameValid(props.process.name, props.process, props.allProcesses),
                description: props.process.description,
                returnPaths: props.process.returnPaths,
                returnPathValidity: props.process.returnPaths.map((path, index) => this.isReturnPathNameValid(index, props.process!.returnPaths)),
                inputs: props.process.inputs.map(i => { return { type: getType(i.typeName), name: i.name }; }),
                inputValidity: props.process.inputs.map((param, index) => this.isParameterNameValid(index, props.process!.inputs)),
                outputs: props.process.outputs.map(o => { return { type: getType(o.typeName), name: o.name }; }),
                outputValidity: props.process.outputs.map((param, index) => this.isParameterNameValid(index, props.process!.outputs)),
            };
    }

    render() {
        let classes = 'processEditor';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        const nameChanged = (name: string) => this.setState({
            name,
            nameValid: this.isProcessNameValid(name, this.props.process, this.props.allProcesses),
        });

        const descChanged = (description: string) => this.setState({
            description,
        });

        const returnPathsChanged = (returnPaths: string[]) => this.setState({
            returnPaths,
            returnPathValidity: returnPaths.map((path, index) => this.isReturnPathNameValid(index, returnPaths)),
        });

        const inputsChanged = (params: IParamInfo[]) => this.setState({
            inputs: params,
            inputValidity: params.map((param, index) => this.isParameterNameValid(index, params)),
        });

        const outputsChanged = (params: IParamInfo[]) => this.setState({
            outputs: params,
            outputValidity: params.map((param, index) => this.isParameterNameValid(index, params)),
        });

        const errors = useMemo(() => this.getErrors(), [
            this.state.nameValid,
            this.state.returnPathValidity,
            this.state.inputValidity,
            this.state.outputValidity,
        ]);

        const canSave = errors.length === 0;
        const validationSummary = canSave
            ? undefined
            : <ul className="processEditor__errors">
                {errors.map((msg, index) => <li className="processEditor__error" key={index}>{msg}</li>)}
            </ul>

        const save = !canSave ? undefined : () => this.saveChanges();
        const cancel = () => this.props.close();

        const canDelete = useMemo(() => this.props.process !== undefined && !isProcessUsedAnywhere(this.props.process, this.props.allProcesses), [this.props.process, this.props.allProcesses])
        
        const deleteProcess = canDelete
            ? () => {
                this.context({
                    type: 'remove process',
                    name: this.props.process!.name,
                });

                this.props.close();
            }
            : undefined

        const deleteButton = this.props.process === undefined
            ? undefined
            : canDelete
                ? <input type="button" className="processEditor__button" value="Delete process" onClick={deleteProcess} />
                : <input type="button" className="processEditor__button" value="Cannot delete" title="This process is used in other processes" disabled={true} />

        return (
            <div className={classes}>
                <SignatureEditor
                    dataTypes={this.props.allTypes}

                    name={this.state.name}
                    nameValid={this.state.nameValid}
                    nameChanged={nameChanged}

                    description={this.state.description}
                    descriptionChanged={descChanged}

                    returnPaths={this.state.returnPaths}
                    returnPathsValid={this.state.returnPathValidity}
                    returnPathsChanged={returnPathsChanged}

                    inputs={this.state.inputs}
                    inputsValid={this.state.inputValidity}
                    inputsChanged={inputsChanged}

                    outputs={this.state.outputs}
                    outputsValid={this.state.outputValidity}
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

    private getErrors() {
        const errors = [];

        if (!this.state.nameValid) {
            errors.push(
                this.state.name.trim() === ''
                    ? 'Give this process a name.'
                    : 'This name is already in use, give this process a different name.'
            );
        }
        
        if (!this.state.returnPathValidity.reduce((prev, curr) => prev && curr, true)) {
            errors.push(
                this.state.returnPaths.length === 1
                ? 'Cannot have only one named return path. Either add more or remove this named path.'
                : 'Ensure that all return paths have unique names.'
            );
        }

        if (!this.state.inputValidity.reduce((prev, curr) => prev && curr, true)) {
            errors.push('Ensure that all inputs have unique names.');
        }

        if (!this.state.outputValidity.reduce((prev, curr) => prev && curr, true)) {
            errors.push('Ensure that all outputs have unique names.');
        }
        
        return errors;
    }

    private saveChanges() {
        if (this.props.process === undefined) {
            this.context({
                type: 'add process',
                name: this.state.name,
                description: this.state.description,
                inputs: this.state.inputs.map(i => { return {
                    name: i.name,
                    typeName: i.type.name,
                }}),
                outputs: this.state.outputs.map(o => { return {
                    name: o.name,
                    typeName: o.type.name,
                }}),
                returnPaths: this.state.returnPaths,
                folder: null, // TODO handle this
            });
        }
        else {
            const mapParam = (name: string, params: IParamInfo[]) => {
                const matched = params.find(p => 
                    p.underlyingParameter !== undefined
                    && p.underlyingParameter.name === name
                    && p.type.name === p.underlyingParameter.typeName // TODO: use is assignable to / from here
                );

                return matched === undefined
                    ? undefined
                    : matched.name;
            }

            this.context({
                type: 'edit process',
                oldName: this.props.process.name,
                newName: this.state.name,
                description: this.state.description,
                folder: null, // TODO: handle this
                inputs: this.state.inputs.map(i => { return {
                    name: i.name,
                    typeName: i.type.name,
                }}),
                outputs: this.state.outputs.map(o => { return {
                    name: o.name,
                    typeName: o.type.name,
                }}),
                mapInputs: i => mapParam(i, this.state.inputs),
                mapOutputs: o => mapParam(o, this.state.outputs),
                returnPaths: this.state.returnPaths,
            });
        }

        this.props.close();
    }

    private isProcessNameValid(name: string, thisProcess: IUserProcess | undefined, allProcesses: IProcess[]) {
        // A process name with space on the end or that exactly matches another is invalid.
        return name !== ''
            && name === name.trim()
            && allProcesses.find(p => p.name === name) === thisProcess;
    }

    private isReturnPathNameValid(pathIndex: number, pathNames: string[]) {
        // A path name with space on the end or that exactly matches another is invalid.
        // A path name is also invalid if we only have one: we should have 0 or 2+.
        const pathName = pathNames[pathIndex];
        return pathName !== ''
            && pathName === pathName.trim()
            && pathNames.indexOf(pathName) === pathIndex
            && pathName.length !== 1;
    }

    private isParameterNameValid(paramIndex: number, parameters: INamed[]) {
        // A parameter name with space on the end or that exactly matches another is invalid.
        const paramName = parameters[paramIndex].name;
        return paramName !== ''
            && paramName === paramName.trim()
            && parameters.findIndex(p => p.name === paramName) === paramIndex;
    }
}