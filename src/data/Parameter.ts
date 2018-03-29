import { Type } from './Type';
import { DataField } from './DataField';
import { Variable } from './Variable';

export class Parameter extends DataField {
    link: Variable | null;
    constructor(name: string, dataType: Type) {
        super(name, dataType);
        this.link = null;
    }
}