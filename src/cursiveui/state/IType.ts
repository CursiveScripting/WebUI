interface ITypeBase {
    name: string;
    color: string;
    guidance?: string;
}

export interface IType extends ITypeBase {
    extendsType?: IType;
    validationExpression?: RegExp;
}

export interface ILookupType extends ITypeBase {
    options: string[];
}

export type DataType = IType | ILookupType;