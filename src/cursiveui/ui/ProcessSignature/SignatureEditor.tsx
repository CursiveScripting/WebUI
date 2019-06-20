import * as React from 'react';
import { UserProcess, Type } from '../../data';
import './SignatureEditor.css';

interface SignatureEditorProps {
    process?: UserProcess;
    className?: string;
    allTypes: Type[];
    save: (process: UserProcess) => void;
    cancel: () => void;
}

interface ParamInfo {
    type: Type;
    name: string;
}

interface SignatureEditorState {
    name: string;
    description: string;
    returnPaths: string[];
    inputs: ParamInfo[];
    outputs: ParamInfo[];
}

export class SignatureEditor extends React.PureComponent<SignatureEditorProps, SignatureEditorState> {
    constructor(props: SignatureEditorProps) {
        super(props);

        if (props.process === undefined) {
            this.state = {
                name: '',
                description: '',
                returnPaths: [],
                inputs: [],
                outputs: [],
            };

            return;
        }

        this.state = {
            name: props.process.name,
            description: props.process.description,
            returnPaths: props.process.returnPaths,
            inputs: props.process.inputs.map(i => { return { type: i.type, name: i.name }; }),
            outputs: props.process.outputs.map(o => { return { type: o.type, name: o.name }; }),
        };
    }

    render() {
        let classes = 'signatureEditor';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        const setName = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ name: e.target.value });
        const setDesc = (e: React.ChangeEvent<HTMLTextAreaElement>) => this.setState({ description: e.target.value });

        const joinedReturnPaths = this.state.returnPaths.join('\n');
        const setReturnPaths = (e: React.ChangeEvent<HTMLTextAreaElement>) => this.setState({
            returnPaths: e.target.value.split('\n').map(val => val.trim()),
        });

        const addInput = () => this.addInput();
        const addOutput = () => this.addOutput();
        const save = () => this.saveChanges();
        const cancel = () => this.props.cancel();

        return (
            <div className={classes}>
                <div className="signatureEditor__wrapper">
                    <div className="signatureEditor__section signatureEditor__section--horizontal">
                        <label>
                            <span className="signatureEditor__label">Process name </span>
                            <input
                                type="text"
                                className="signatureEditor__text"
                                value={this.state.name}
                                onChange={setName}
                                placeholder="Enter a unique name"
                            />
                        </label>
                    </div>
                    <div className="signatureEditor__section">
                        <label>
                            <div className="signatureEditor__label">Description</div>
                            <textarea
                                className="signatureEditor__textarea"
                                value={this.state.description}
                                onChange={setDesc}
                                placeholder="Describe what this process does"
                            />
                        </label>
                    </div>
                    <div className="signatureEditor__section">
                        <label>
                            <div className="signatureEditor__label">Return paths</div>
                            <textarea
                                className="signatureEditor__textarea"
                                value={joinedReturnPaths}
                                onChange={setReturnPaths}
                                placeholder="Enter each path name on a separate line.
Leave blank unless there are multiple return paths."
                            />
                        </label>
                    </div>
                    <div className="signatureEditor__section">
                        <label>
                            <div className="signatureEditor__label">Inputs</div>
                            {this.renderParameters(true)}
                            <input type="button" className="signatureEditor__button" onClick={addInput} value="add new" />
                        </label>
                    </div>
                    <div className="signatureEditor__section">
                        <label>
                            <span className="signatureEditor__label">Outputs</span>
                            {this.renderParameters(false)}
                            <input type="button" className="signatureEditor__button" onClick={addOutput} value="add new" />
                        </label>
                    </div>
                    <div className="signatureEditor__footer">
                        <input type="button" className="signatureEditor__button signatureEditor__button--save" value="Save changes" onClick={save} />
                        <input type="button" className="signatureEditor__button" value="Cancel" onClick={cancel} />
                    </div>
                </div>
            </div>
        );
    }

    private renderParameters(input: boolean) {
        const params = input ? this.state.inputs : this.state.outputs;

        return params.map((param, idx) => {
            return (
                <div className="signatureEditor__parameter" key={idx}>
                    {param.type.name}

                    <input
                        type="text"
                        className="signatureEditor__text"
                        value={param.name}
                        onChange={e => this.setParamName(param, e.target.validationMessage, input)}
                        placeholder="Enter a unique name"
                    />
                </div>
            );
        });
    }

    private addInput() {
        this.setState(prevState => {
            const newInputs = prevState.inputs.slice();
            newInputs.push({
                name: 'New input',
                type: this.props.allTypes[0],
            });
            return { inputs: newInputs };
        });
    }

    private addOutput() {
        this.setState(prevState => {
            const newOutputs = prevState.outputs.slice();
            newOutputs.push({
                name: 'New output',
                type: this.props.allTypes[0],
            });
            return { outputs: newOutputs };
        });
    }

    private setParamName(param: ParamInfo, name: string, input: boolean) {
        param.name = name;

        if (input) {
            this.setState(prevState => { return { inputs: prevState.inputs.slice() }; });
        }
        else {
            this.setState(prevState => { return { outputs: prevState.outputs.slice() }; });
        }
    }

    private saveChanges() {
        const process = this.props.process === undefined
            ? new UserProcess(this.state.name, [], [], [], [], false, this.state.description, null)
            : this.props.process;

        process.name = this.state.name;
        process.description = this.state.description;
        // process.returnPaths = this.state.returnPaths.filter(name => name.length > 0);
        
        // TODO: save inputs and outputs

        this.props.save(process);
    }

    private isPathNameValid(pathIndex: number, pathNames: string[]) {
        // A path name with space on the end or that exactly matches another is invalid
        const pathName = pathNames[pathIndex];
        const trimmed = pathNames[pathIndex].trim();
    
        return pathName === trimmed && pathNames.indexOf(pathName) === pathIndex;
    }
}