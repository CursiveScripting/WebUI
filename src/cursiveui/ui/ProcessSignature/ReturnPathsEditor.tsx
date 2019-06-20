import * as React from 'react';
import './ReturnPathsEditor.css';
import { ReturnPathEditor } from './ReturnPathEditor';

interface Props {
    className?: string;
    pathNames: string[];
    pathValidity: boolean[];
    pathsChanged: (pathNames: string[]) => void;
}

export const ReturnPathsEditor: React.FunctionComponent<Props> = props => {
    let classes = 'returnPathsEditor';
    if (props.className !== undefined) {
        classes += ' ' + props.className;
    }

    const allPathNamesValid = props.pathNames.length !== 1 && props.pathValidity.reduce((prev, current) => current, true);

    if (!allPathNamesValid) {
        classes += ' returnPathsEditor--invalid';
    }

    let paths;
    if (props.pathNames.length === 0) {
        paths = 'No named return paths';
    }
    else {
        const changePath = (name: string, index: number) => {
            const newPaths = props.pathNames.slice();
            newPaths[index] = name;
            props.pathsChanged(newPaths);
        };

        const removePath = (index: number) => {
            const newPaths = props.pathNames.slice().splice(index, 1);
            props.pathsChanged(newPaths);
        };

        paths = props.pathNames.map((path: string, index: number) => (
            <ReturnPathEditor
                key={index}
                path={path}
                isValid={props.pathValidity[index]}
                renamePath={name => changePath(name, index)}
                removePath={() => removePath(index)}
            />
        ));
    }

    const addPath = props.pathNames.length === 0
        ? () => props.pathsChanged(['', ''])
        : () => props.pathsChanged([...props.pathNames, '']);

    return <div className={classes}>
        {paths}
        <button className="returnPathEditor__add" onClick={addPath}>
            {props.pathNames.length === 0 ? 'Use named paths' : 'Add path'}
        </button>
    </div>
}