export interface IType {
    name: string;
    color: string;
    extendsType?: IType;
    validationExpression?: string;
    guidance?: string;
}