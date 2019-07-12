import { IType } from '../../workspaceState/IType';
import { IUserProcess } from '../../workspaceState/IUserProcess';
import { IVariable } from '../../workspaceState/IVariable';
import { usesOutputs, usesInputs } from '../../services/StepFunctions';

export interface IVariableDisplay {
    name: string;
    type: IType;
    initialValue: string | null;
    x: number;
    y: number;
    inputConnected: boolean;
    outputConnected: boolean;
}

function hasValue(record: Record<string, string>, value: string) {
    for (const property in record) {
        if (record[property] === value) {
            return true;
        }
    }

    return false;
}

export function populateVariableDisplay(
    variable: IVariable,
    inProcess: IUserProcess,
    typesByName: Map<string, IType>
): IVariableDisplay {

    const inputConnected = inProcess.steps.find(step => usesOutputs(step) && hasValue(step.outputs, variable.name)) !== undefined;

    const outputConnected = inProcess.steps.find(step => usesInputs(step) && hasValue(step.inputs, variable.name)) !== undefined;

    return {
        name: variable.name,
        type: typesByName.get(variable.typeName)!,
        initialValue: variable.initialValue,
        x: variable.x,
        y: variable.y,
        inputConnected,
        outputConnected,
    }
}