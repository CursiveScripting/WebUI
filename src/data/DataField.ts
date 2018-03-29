import { Type } from './Type';

export abstract class DataField {
    initialValue: string | null;
    constructor(public name: string, public type: Type) {
        this.initialValue = null;
    }
}