import * as React from 'react';
import { Variable } from '../../data';
import { VariableDisplay } from './VariableDisplay';

interface Props {
    variables: Variable[];
    refs: Map<Variable, VariableDisplay>;
    removeVariable: (variable: Variable) => void;
    initialValueChanged: (variable: Variable, value: string | null) => void;

    startDragHeader: (variable: Variable, x: number, y: number) => void;
    startDragConnector: (variable: Variable, input: boolean) => void;
    stopDragConnector: (variable: Variable, input: boolean) => void;
}

export const VariablesDisplay = (props: Props) => {
    props.refs.clear();

    const variables = props.variables.map(variable => (
        <VariableDisplay
            ref={v => { if (v !== null) { props.refs.set(variable, v); } else { props.refs.delete(variable); }}}
            variable={variable}
            key={variable.name}
            deleteClicked={() => props.removeVariable(variable)}
            initialValueChanged={val => props.initialValueChanged(variable, val)}
            headerMouseDown={(x, y) => props.startDragHeader(variable, x, y)}
            connectorMouseDown={input => props.startDragConnector(variable, input)}
            connectorMouseUp={input => props.stopDragConnector(variable, input)}
        />
    ));

    return <>
        {variables}
    </>
}