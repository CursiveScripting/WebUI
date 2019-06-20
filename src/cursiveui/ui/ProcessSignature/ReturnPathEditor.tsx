import * as React from 'react';
import './ReturnPathEditor.css';
import { ValueInput } from '../ProcessContent/ValueInput';

interface Props {
    path: string;
    isValid: boolean;
    renamePath: (name: string) => void;
    removePath: () => void;
}

export const ReturnPathEditor: React.FunctionComponent<Props> = props => {
    let classes = 'returnPathEditor';
    if (!props.isValid) {
        classes += ' returnPathEditor--invalid'
    }

    return <div className={classes}>
        <ValueInput
            className="returnPathEditor__path"
            value={props.path}
            valueChanged={props.renamePath}
            isValid={props.isValid}
        />
        
        <button className="returnPathEditor__remove" onClick={props.removePath}>
            Remove path
        </button>
    </div>
}