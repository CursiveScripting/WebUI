import { Type } from './Type';
import { DataField } from './DataField';
import { Parameter } from './Parameter';
import { Positionable } from './Positionable';

export class Variable extends DataField implements Positionable {
    links: Parameter[];
    constructor(name: string, dataType: Type, public x: number, public y: number) {
        super(name, dataType);
        this.links = [];
    }
}