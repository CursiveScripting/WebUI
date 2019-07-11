import * as React from 'react';
import { VariableDisplay } from './VariableDisplay';
import { IVariable } from '../../workspaceState/IVariable';

interface Props {
    processName: string;
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

    const variables = props.variables.map(variable => {
        const inputConnected = false; // TODO: determine this
        const outputConnected = false; // TODO: determine this
        const canEdit = true; // TODO: determine this based on type having a validationExpression or not
        
        return (
            <VariableDisplay
                ref={v => { if (v !== null) { props.refs.set(variable.name, v); } else { props.refs.delete(variable.name); }}}
                name={variable.name}
                initialValue={variable.initialValue}
                type={variable.type}
                x={variable.x}
                y={variable.y}
                canEdit={canEdit}
                inputConnected={inputConnected}
                outputConnected={outputConnected}
                inProcessName={props.processName}
                key={variable.name}
                
                headerMouseDown={(x, y) => props.startDragHeader(variable, x, y)}
                connectorMouseDown={(input, x, y) => props.startDragConnector(variable, input, x, y)}
                connectorMouseUp={input => props.stopDragConnector(variable, input)}
            />
        );
    });

    return <>
        {variables}
    </>
}