import * as React from 'react';
import { UserProcess, Type, SystemProcess, Parameter } from '../../data';
import './SignatureEditor.css';
import { ParamInfo, SignatureDisplay } from './SignatureDisplay';

interface SignatureEditorProps {
    process?: UserProcess;
    className?: string;
    allUserProcesses: Map<string, UserProcess>;
    allSystemProcesses: Map<string, SystemProcess>;
    allTypes: Type[];
    processUpdated: (oldName: string | null, process: UserProcess) => void;
    cancel: () => void;
}

interface SignatureEditorState {
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

export class SignatureEditor extends React.PureComponent<SignatureEditorProps, SignatureEditorState> {
    constructor(props: SignatureEditorProps) {
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
        let classes = 'signatureEditor';
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

        const canSave = this.canSave();
        const save = () => this.saveChanges();
        const cancel = () => this.props.cancel();

        return (
            <div className={classes}>
                <SignatureDisplay
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
                
                <div className="signatureEditor__footer">
                    <input type="button" className="signatureEditor__button signatureEditor__button--save" value="Save changes" onClick={save} disabled={!canSave} />
                    <input type="button" className="signatureEditor__button" value="Cancel" onClick={cancel} />
                </div>
            </div>
        );
    }

    private canSave() {
        return this.state.nameValid
            && this.state.returnPathValidity.reduce((prev, curr) => prev && curr, true)
            && this.state.inputValidity.reduce((prev, curr) => prev && curr, true)
            && this.state.inputValidity.reduce((prev, curr) => prev && curr, true)
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