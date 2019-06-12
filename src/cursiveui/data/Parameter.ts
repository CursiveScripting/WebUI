import { Type } from './Type';
import { DataField } from './DataField';
import { Variable } from './Variable';

export class Parameter extends DataField {
    link: Variable | null;
    isValid: boolean;
    constructor(name: string, dataType: Type, readonly input: boolean) {
        super(name, dataType);
        this.link = null;
        this.isValid = true;
    }
}