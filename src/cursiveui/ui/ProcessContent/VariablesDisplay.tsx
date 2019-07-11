import * as React from 'react';
import { VariableDisplay } from './VariableDisplay';
import { IVariable } from '../../workspaceState/IVariable';
import { IStep } from '../../workspaceState/IStep';

interface Props {
    variables: IVariable[];
    refs: Map<string, VariableDisplay>;
    /*
    removeVariable: (variable: Variable) => void;
    initialValueChanged: (variable: Variable, value: string | null) => void;

    startDragHeader: (variable: Variable, x: number, y: number) => void;
    startDragConnector: (variable: Variable, input: boolean, x: number, y: number) => void;
    stopDragConnector: (variable: Variable, input: boolean) => void;
    */
}

export const VariablesDisplay = (props: Props) => {
    props.refs.clear();

    const variables = props.variables.map(variable => (
        <VariableDisplay
            ref={v => { if (v !== null) { props.refs.set(variable.name, v); } else { props.refs.delete(variable.name); }}}
            name={variable.name}
            initialValue={variable.initialValue}
            type={variable.type}
            x={variable.x}
            y={variable.y}
            key={variable.name}
            /*
            deleteClicked={() => props.removeVariable(variable)}
            initialValueChanged={val => props.initialValueChanged(variable, val)}
            headerMouseDown={(x, y) => props.startDragHeader(variable, x, y)}
            connectorMouseDown={(input, x, y) => props.startDragConnector(variable, input, x, y)}
            connectorMouseUp={input => props.stopDragConnector(variable, input)}
            */
        />
    ));

    return <>
        {variables}
    </>
}