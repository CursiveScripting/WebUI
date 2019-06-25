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

    let prompt: string;
    let paths;

    if (props.pathNames.length === 0) {
        prompt = 'No named return paths';
    }
    else {
        prompt = 'Return paths:';

        const changePath = (name: string, index: number) => {
            const newPaths = props.pathNames.slice();
            newPaths[index] = name;
            props.pathsChanged(newPaths);
        };

        const removePath = (index: number) => {
            const newPaths = props.pathNames.slice();
            newPaths.splice(index, 1);
            props.pathsChanged(newPaths);
        };

        paths = props.pathNames.map((path: string, index: number) => {
            const moveUp = index === 0
                ? undefined
                : () => {
                    const newPaths = props.pathNames.slice();
                    newPaths.splice(index, 1);
                    newPaths.splice(index - 1, 0, path);
                    props.pathsChanged(newPaths);
                };

            const moveDown = index === props.pathNames.length - 1
                ? undefined
                : () => {
                    const newPaths = props.pathNames.slice();
                    newPaths.splice(index, 1);
                    newPaths.splice(index + 1, 0, path);
                    props.pathsChanged(newPaths);
                };

            return (
                <ReturnPathEditor
                    key={index}
                    path={path}
                    isValid={props.pathValidity[index]}
                    renamePath={name => changePath(name, index)}
                    removePath={() => removePath(index)}
                    moveUp={moveUp}
                    moveDown={moveDown}
                />
            )
        });
    }

    const addPath = props.pathNames.length === 0
        ? () => props.pathsChanged(['', ''])
        : () => props.pathsChanged([...props.pathNames, '']);

    return <div className={classes}>
        <div className="returnPathsEditor__prompt">{prompt}</div>
        {paths}
        <button className="returnPathsEditor__add" onClick={addPath}>
            {props.pathNames.length === 0 ? 'Use named paths' : 'Add return path'}
        </button>
    </div>
}