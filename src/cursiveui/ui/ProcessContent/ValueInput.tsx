import * as React from 'react';
import ContentEditable from 'react-contenteditable';
import './ValueInput.css';

interface Props {
    className?: string;
    value: string;
    isValid: boolean;
    valueChanged: (value: string) => void;
    doneEditing?: () => void;
}

export const ValueInput: React.FunctionComponent<Props> = props => {
    let classes = 'valueInput';
    if (props.value.trim().length === 0) {
        classes += ' valueInput--noValue';
    }
    if (!props.isValid) {
        classes += ' valueInput--invalid';
    }
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => props.valueChanged(e.target.value);
    const onBlur = props.doneEditing === undefined
        ? undefined
        : () => props.doneEditing!();

    return <ContentEditable
        className={classes}
        html={props.value}
        onChange={onChange}
        onBlur={onBlur}
    />
}
