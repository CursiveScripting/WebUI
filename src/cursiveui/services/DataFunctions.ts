export function createMap<TElement>(elements: TElement[], getKey: (el: TElement) => string) {
    const map = new Map<string, TElement>();

    for (const element of elements) {
        map.set(getKey(element), element);
    }

    return map;
}

export function isString(data: string | Document): data is string {
    return typeof data === 'string';
}

export function mapRecordKeys<TKey extends string | number | symbol, TValue>(
    input: Record<TKey, TValue>,
    map: (prev: TKey) => TKey | undefined
) {
    const output: Record<TKey, TValue> = {} as Record<TKey, TValue>;

    for (const prop in input) {
        const newProp = map(prop);
        if (newProp !== undefined) {
            output[newProp] = input[prop];
        }
    }

    return output;
}

export function isValueValid(value: string | null, expression: string | undefined) {
    if (value === null || expression === undefined) {
        return true;
    }

    const expr = new RegExp(expression);
    return expr.test(value);
}