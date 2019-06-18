import * as React from 'react';
import './ValueInput.css';

interface Props {
    className?: string;
    value: string | null;
    isValid: boolean;
    valueChanged: (value: string | null) => void;
}

export const ValueInput: React.FunctionComponent<Props> = props => {
    let classes = 'valueInput';
    if (props.value === null) {
        classes += ' valueInput--noValue';
    }
    if (!props.isValid) {
        classes += ' valueInput--invalid';
    }
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const valueChanged = (e: React.ChangeEvent<HTMLInputElement>) => props.valueChanged(e.target.value === '' ? null : e.target.value);

    const strValue = props.value === null
        ? ''
        : props.value;

    return <div className={classes}>
        <input className="valueInput__input" placeholder="Initial value" onChange={valueChanged} value={strValue} size={1} />
    </div>
}
