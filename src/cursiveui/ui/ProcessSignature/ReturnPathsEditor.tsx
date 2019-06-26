import * as React from 'react';
import './ReturnPathsEditor.css';
import { SortableList } from './SortableList';
import { ValueInput } from '../ProcessContent/ValueInput';

interface Props {
    className?: string;
    pathNames: string[];
    pathValidity: boolean[];
    pathsChanged: (pathNames: string[]) => void;
}

export const ReturnPathsEditor: React.FunctionComponent<Props> = props => {
    const prompt = props.pathNames.length === 0
        ? 'No named return paths'
        : 'Return paths:';

    const editPath = (index: number, newName: string) => {
        const newPaths = props.pathNames.slice();
        newPaths[index] = newName;
        props.pathsChanged(newPaths);
    };

    const createNewItems = () => props.pathNames.length === 0
        ? ['', '']
        : ['']

    const renderItem = (index: number) => {
        const pathName = props.pathNames[index];

        return <ValueInput
            className="returnPathEditor__path"
            value={pathName}
            valueChanged={name => editPath(index, name)}
            isValid={props.pathValidity[index]}
        />
    }

    return <SortableList
        className="returnPathsEditor"
        prompt={prompt}
        addText={props.pathNames.length === 0 ? 'Use named paths' : 'Add return path'}
        createNewItems={createNewItems}
        items={props.pathNames}
        itemValidity={props.pathValidity}
        itemsChanged={props.pathsChanged}
        renderItem={renderItem}
    />
}