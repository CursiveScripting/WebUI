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

export function isValueValid(value: string | null, expression: string | undefined) {
    if (value === null || expression === undefined) {
        return true;
    }

    const expr = new RegExp(expression);
    return expr.test(value);
}