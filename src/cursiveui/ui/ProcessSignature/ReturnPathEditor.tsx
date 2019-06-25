import * as React from 'react';
import './ReturnPathEditor.css';
import { ValueInput } from '../ProcessContent/ValueInput';

interface Props {
    path: string;
    isValid: boolean;
    renamePath: (name: string) => void;
    removePath: () => void;
    moveUp?: () => void;
    moveDown?: () => void;
}

export const ReturnPathEditor: React.FunctionComponent<Props> = props => {
    let classes = 'returnPathEditor';
    if (!props.isValid) {
        classes += ' returnPathEditor--invalid'
    }

    const moveUp = props.moveUp === undefined
        ? <div className="returnPathEditor__spacer" />
        : <button
            className="returnPathEditor__moveUp"
            onClick={props.moveUp}
        />

    const moveDown = props.moveDown === undefined
        ? <div className="returnPathEditor__spacer" />
        : <button
            className="returnPathEditor__moveDown"
            onClick={props.moveDown}
        />

    return <div className={classes}>
        <ValueInput
            className="returnPathEditor__path"
            value={props.path}
            valueChanged={props.renamePath}
            isValid={props.isValid}
        />

        {moveUp}
        {moveDown}
        <button
            className="returnPathEditor__remove"
            onClick={props.removePath}
        />
    </div>
}