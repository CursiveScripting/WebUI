import * as React from 'react';
import { UserProcess, Type, SystemProcess, Parameter } from '../../data';
import './ProcessEditor.css';
import { ParamInfo, SignatureEditor } from './SignatureEditor';

interface Props {
    process?: UserProcess;
    className?: string;
    allUserProcesses: Map<string, UserProcess>;
    allSystemProcesses: Map<string, SystemProcess>;
    allTypes: Type[];
    processUpdated: (oldName: string | null, process: UserProcess) => void;
    cancel: () => void;
    delete: undefined | (() => void);
}

interface State {
    name: string;
    nameValid: boolean;
    description: string;
    returnPaths: string[];
    returnPathValidity: boolean[];
    inputs: ParamInfo[];
    inputValidity: boolean[];
    outputs: ParamInfo[];
    outputValidity: boolean[];
    // TODO: folder
}

export class ProcessEditor extends React.PureComponent<Props, State> {
    constructor(props: Props) {
        super(props);

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
                nameValid: this.isProcessNameValid(props.process.name, props.process, props.allUserProcesses, props.allSystemProcesses),
                description: props.process.description,
                returnPaths: props.process.returnPaths,
                returnPathValidity: props.process.returnPaths.map((path, index) => this.isReturnPathNameValid(index, props.process!.returnPaths)),
                inputs: props.process.inputs.map(i => { return { type: i.type, name: i.name }; }),
                inputValidity: props.process.inputs.map((param, index) => this.isParameterNameValid(index, props.process!.inputs)),
                outputs: props.process.outputs.map(o => { return { type: o.type, name: o.name }; }),
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
            nameValid: this.isProcessNameValid(name, this.props.process, this.props.allUserProcesses, this.props.allSystemProcesses),
        });

        const descChanged = (description: string) => this.setState({
            description,
        });

        const returnPathsChanged = (returnPaths: string[]) => this.setState({
            returnPaths,
            returnPathValidity: returnPaths.map((path, index) => this.isReturnPathNameValid(index, returnPaths)),
        });

        const inputsChanged = (params: ParamInfo[]) => this.setState({
            inputs: params,
            inputValidity: params.map((param, index) => this.isParameterNameValid(index, params)),
        });

        const outputsChanged = (params: ParamInfo[]) => this.setState({
            outputs: params,
            outputValidity: params.map((param, index) => this.isParameterNameValid(index, params)),
        });

        const errors = this.getErrors();

        const canSave = errors.length === 0;
        const validationSummary = canSave
            ? undefined
            : <ul className="processEditor__errors">
                {errors.map((msg, index) => <li className="processEditor__error" key={index}>{msg}</li>)}
            </ul>

        const save = !canSave ? undefined : () => this.saveChanges();
        const cancel = () => this.props.cancel();
        const deleteProc = () => this.props.delete!();

        const deleteButton = this.props.process === undefined
            ? undefined
            : this.props.delete === undefined
                ? <input type="button" className="processEditor__button" value="Cannot delete" title="This process is used in other processes" disabled={true} />
                : <input type="button" className="processEditor__button" value="Delete process" onClick={deleteProc} />

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
        let process: UserProcess;
        let oldProcessName: string | null;

        if (this.props.process === undefined) {
            oldProcessName = null;
            process = new UserProcess(this.state.name, [], [], [], [], false, this.state.description, null)
        }
        else {
            oldProcessName = this.props.process.name;

            process = this.props.process;
            process.name = this.state.name;
            process.description = this.state.description;
        }


        // remove all return paths, add all new ones
        process.returnPaths.splice(0, process.returnPaths.length, ...this.state.returnPaths);
        
        this.saveParameters(this.state.inputs, process.inputs, true);
        this.saveParameters(this.state.outputs, process.outputs, false);

        this.props.processUpdated(oldProcessName, process);
    }

    private saveParameters(source: ParamInfo[], destination: Parameter[], isInput: boolean) {
        // empty the destination array
        destination.splice(0, destination.length);

        // add all new parameters back in, hooking up to existing parameter objects if their type hasn't changed
        for (const paramInfo of source) {
            let parameter: Parameter;

            if (paramInfo.underlyingParameter === undefined || paramInfo.underlyingParameter.type !== paramInfo.type) {
                parameter = new Parameter(paramInfo.name, paramInfo.type, isInput);
            }
            else {
                parameter = paramInfo.underlyingParameter;
                parameter.name = paramInfo.name;
                parameter.type = paramInfo.type;
            }
        }
    }

    private isProcessNameValid(name: string, thisProcess: UserProcess | undefined, userProcesses: Map<string, UserProcess>, systemProcesses: Map<string, SystemProcess>) {
        // A process name with space on the end or that exactly matches another is invalid.
        return name !== ''
            && name === name.trim()
            && systemProcesses.get(name) === undefined
            && userProcesses.get(name) === thisProcess
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

    private isParameterNameValid(paramIndex: number, parameters: ParamInfo[]) {
        // A parameter name with space on the end or that exactly matches another is invalid.
        const paramName = parameters[paramIndex].name;
        return paramName !== ''
            && paramName === paramName.trim()
            && parameters.findIndex(p => p.name === paramName) === paramIndex;
    }
}