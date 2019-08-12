import { IType, ILookupType, DataType } from '../state/IType';

export function isTypeAssignable(source: DataType, dest: DataType) {
    if (usesOptions(source)) {
        return source === dest;
    }

    let test: IType | undefined = source;

    do {
        if (test === dest) {
            return true;
        }

        test = test.extendsType;
    } while (test !== undefined)

    return false;
}

export function usesOptions(type: DataType): type is ILookupType {
    return (type as any).options !== undefined;
}