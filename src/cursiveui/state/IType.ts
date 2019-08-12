interface ITypeBase {
    name: string;
    color: string;
    guidance?: string;
}

export interface IType extends ITypeBase {
    extendsType?: IType;
    validationExpression?: string;
}

export interface ILookupType extends ITypeBase {
    options: string[];
}

export type DataType = IType | ILookupType;