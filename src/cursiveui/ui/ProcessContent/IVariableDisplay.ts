import { IType } from '../../workspaceState/IType';
import { IProcess } from '../../workspaceState/IProcess';
import { IVariable } from '../../workspaceState/IVariable';

export interface IVariableDisplay {
    name: string;
    type: IType;
    initialValue: string | null;
    x: number;
    y: number;
    inputConnected: boolean;
    outputConnected: boolean;
}
export function populateVariableDisplay(
    variable: IVariable,
    inProcess: IProcess,
    typesByName: Map<string, IType>
): IVariableDisplay {

    return {
        name: variable.name,
        type: typesByName.get(variable.typeName)!,
        initialValue: variable.initialValue,
        x: variable.x,
        y: variable.y,
        inputConnected: false, // TODO: determine this
        outputConnected: false, // TODO: determine this
    }
}