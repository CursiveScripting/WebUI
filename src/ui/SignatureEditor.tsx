import * as React from 'react';
import { UserProcess } from '../data';
import './SignatureEditor.css';

interface SignatureEditorProps {
    process?: UserProcess;
    className?: string;
    save: () => void;
    cancel: () => void;
}

interface SignatureEditorState {
    name: string;
}

export class SignatureEditor extends React.PureComponent<SignatureEditorProps, SignatureEditorState> {
    constructor(props: SignatureEditorProps) {
        super(props);

        if (props.process === undefined) {
            this.state = {
                name: '',
            };

            return;
        }

        this.state = {
            name: props.process.name,
        };
    }

    render() {
        let classes = 'signatureEditor';
        if (this.props.className !== undefined) {
            classes += ' ' + this.props.className;
        }

        const setName = (e: React.ChangeEvent<HTMLInputElement>) => this.setState({ name: e.target.value });

        const save = () => this.props.save();
        const cancel = () => this.props.cancel();

        return (
            <div className={classes}>
                <div className="signatureEditor__section">
                    <label>
                        <span className="signatureEditor__label">Process name</span> <input type="text" value={this.state.name} onChange={setName} />
                    </label>
                </div>
                <div className="signatureEditor__section">
                    <label>
                        <span className="signatureEditor__label">Return paths</span>
                    </label>
                </div>
                <div className="signatureEditor__section">
                    <label>
                        <span className="signatureEditor__label">Inputs</span>
                    </label>
                </div>
                <div className="signatureEditor__section">
                    <label>
                        <span className="signatureEditor__label">Outputs</span>
                    </label>
                </div>
                <div>
                    <input type="button" className="signatureEditor__button signatureEditor__button--save" value="Save changes" onClick={save} />
                    <input type="button" className="signatureEditor__button" value="Cancel" onClick={cancel} />
                </div>
            </div>
        );
    }
}