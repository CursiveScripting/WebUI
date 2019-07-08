import { Type } from './Type';
import { DataField } from './DataField';
import { IVariable } from '../workspaceState/IVariable';

export class Parameter extends DataField {
    link: IVariable | null;
    isValid: boolean;
    constructor(name: string, dataType: Type, readonly input: boolean) {
        super(name, dataType);
        this.link = null;
        this.isValid = true;
    }
}